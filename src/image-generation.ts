/**
 * Venice.ai Image Generation Provider
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveApiKeyForProvider } from "openclaw/plugin-sdk/provider-auth-runtime";
import { isProviderApiKeyConfigured } from "openclaw/plugin-sdk/provider-auth";
import type {
  ImageGenerationRequest,
  ImageGenerationResult,
  OpenClawPluginApi,
} from "openclaw/plugin-sdk";
import {
  PROVIDER_ID,
  PROVIDER_NAME,
  DEFAULT_IMAGE_MODEL,
  VENICE_IMAGE_MODELS,
  VENICE_SUPPORTED_SIZES,
  VENICE_API_BASE_URL,
  DEFAULT_IMAGE_MIME,
  type VeniceConfig,
} from "./config.js";

export function registerImageGenerationProvider(api: OpenClawPluginApi, config: VeniceConfig): void {
  const outputDir = config.outputDir
    ? config.outputDir.replace(/^~\//, homedir() + "/")
    : join(homedir(), "Downloads", "venice-ai-output");

  api.registerImageGenerationProvider({
    id: PROVIDER_ID,
    label: PROVIDER_NAME,

    defaultModel: config.defaultImageModel ?? DEFAULT_IMAGE_MODEL,
    models: [...VENICE_IMAGE_MODELS],

    isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
        provider: "venice",
        agentDir,
      }),

    capabilities: {
      generate: {
        maxCount: 4,
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: true,
      },
      edit: {
        enabled: true,
        maxCount: 1,
        maxInputImages: 1,
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: false,
      },
      geometry: {
        sizes: [...VENICE_SUPPORTED_SIZES],
      },
    },

    async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
      const { prompt, model, size, aspectRatio, resolution, count = 1, agentDir, authStore } = req;

      // Access runtime config
      const pluginConfig = req.cfg?.plugins?.entries?.[PROVIDER_ID]?.config as VeniceConfig | undefined;
      const negativePrompt = pluginConfig?.defaultNegativePrompt ?? config.defaultNegativePrompt;
      const stylePreset = pluginConfig?.defaultStylePreset ?? config.defaultStylePreset;
      const outputFormat = (pluginConfig?.defaultOutputFormat ?? config.defaultOutputFormat) ?? "webp";

      const auth = await resolveApiKeyForProvider({
        provider: "venice",
        cfg: req.cfg,
        agentDir,
        store: authStore,
      });

      const apiKey = auth.apiKey;
      if (!apiKey) {
        throw new Error(
          "Venice.ai API key not configured. Run: openclaw models auth setup-token --provider venice"
        );
      }

      const baseUrl = config.baseUrl ?? VENICE_API_BASE_URL;
      const modelToUse = model || (pluginConfig?.defaultImageModel ?? config.defaultImageModel ?? DEFAULT_IMAGE_MODEL);

      await mkdir(outputDir, { recursive: true });

      const inputImages = req.inputImages ?? [];
      const isEdit = inputImages.length > 0;

      // Parse edit intent from prompt
      let editIntent: "edit" | "removeBackground" | "upscale" = "edit";
      if (isEdit) {
        const promptLower = prompt.toLowerCase();
        if (promptLower.includes("remove background") || promptLower.includes("remove the background")) {
          editIntent = "removeBackground";
        } else if (promptLower.includes("upscale") || promptLower.includes("enhance")) {
          editIntent = "upscale";
        }
      }

      const images: Array<{ buffer: Buffer; mimeType: string; fileName: string }> = [];

      if (isEdit) {
        await handleImageEdit(inputImages[0], prompt, aspectRatio, baseUrl, apiKey, images, editIntent);
      } else {
        await handleImageGeneration(
          prompt,
          modelToUse,
          size,
          aspectRatio,
          resolution,
          count,
          config,
          negativePrompt,
          stylePreset,
          outputFormat,
          baseUrl,
          apiKey,
          outputDir,
          images
        );
      }

      return { images, model: modelToUse };
    },
  });
}

async function handleImageEdit(
  firstImage: { buffer?: Buffer; url?: string },
  prompt: string,
  aspectRatio: string | undefined,
  baseUrl: string,
  apiKey: string,
  images: Array<{ buffer: Buffer; mimeType: string; fileName: string }>,
  editIntent: "edit" | "removeBackground" | "upscale"
): Promise<void> {
  if (!firstImage.buffer) {
    throw new Error("Input image must have buffer");
  }

  const imageBase64 = firstImage.buffer.toString("base64");

  if (editIntent === "removeBackground") {
    const response = await fetch(`${baseUrl}/image/background-remove`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Background removal error: ${response.status} - ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    images.push({
      buffer,
      mimeType: "image/png",
      fileName: `venice-bg-removed-${Date.now()}.png`,
    });
  } else if (editIntent === "upscale") {
    const response = await fetch(`${baseUrl}/image/upscale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        image: imageBase64,
        scale: 2,
        enhance: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upscale error: ${response.status} - ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    images.push({
      buffer,
      mimeType: "image/png",
      fileName: `venice-upscaled-${Date.now()}.png`,
    });
  } else {
    // General image edit
    const requestBody: Record<string, unknown> = {
      model: "qwen-edit",
      prompt,
      safe_mode: false,
      image: imageBase64,
    };

    if (aspectRatio) {
      requestBody.aspect_ratio = aspectRatio;
    }

    const response = await fetch(`${baseUrl}/image/edit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image edit error: ${response.status} - ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    images.push({
      buffer,
      mimeType: "image/png",
      fileName: `venice-edit-${Date.now()}.png`,
    });
  }
}

async function handleImageGeneration(
  prompt: string,
  modelToUse: string,
  size: string | undefined,
  aspectRatio: string | undefined,
  resolution: "1K" | "2K" | "4K" | undefined,
  count: number,
  config: VeniceConfig,
  negativePrompt: string | undefined,
  stylePreset: string | undefined,
  outputFormat: string,
  baseUrl: string,
  apiKey: string,
  outputDir: string,
  images: Array<{ buffer: Buffer; mimeType: string; fileName: string }>
): Promise<void> {
  for (let i = 0; i < count; i++) {
    const requestBody: Record<string, unknown> = {
      model: modelToUse,
      prompt,
      seed: Math.floor(Math.random() * 999999999),
      cfg_scale: config.defaultImageCfgScale ?? 7.0,
      steps: config.defaultImageSteps ?? 30,
      format: outputFormat === "jpeg" ? "jpg" : outputFormat,
      embed_exif_metadata: false,
      hide_watermark: config.hideWatermark ?? false,
      safe_mode: config.safeMode ?? false,
      return_binary: true,
    };

    // Sizing
    if (aspectRatio) {
      requestBody.aspect_ratio = aspectRatio;
      if (resolution) {
        requestBody.resolution = resolution;
      }
    } else if (size) {
      const [w, h] = size.split("x").map(Number);
      if (w && h) {
        requestBody.width = w;
        requestBody.height = h;
      } else {
        requestBody.width = 1024;
        requestBody.height = 1024;
      }
    } else {
      requestBody.width = 1024;
      requestBody.height = 1024;
    }

    if (negativePrompt) {
      requestBody.negative_prompt = negativePrompt;
    }
    if (stylePreset) {
      requestBody.style_preset = stylePreset;
    }

    const response = await fetch(`${baseUrl}/image/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Venice.ai API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const timestamp = Date.now();
      const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
      images.push({
        buffer,
        mimeType: `image/${outputFormat}`,
        fileName: `venice-${timestamp}-${images.length}.${ext}`,
      });
    } else {
      const data = await response.json() as Record<string, unknown>;
      if (data.images && Array.isArray(data.images)) {
        for (const img of data.images as string[]) {
          if (typeof img === "string" && img.length > 0) {
            const buffer = Buffer.from(img, "base64");
            const timestamp = Date.now();
            const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
            images.push({
              buffer,
              mimeType: `image/${outputFormat}`,
              fileName: `venice-${timestamp}-${images.length}.${ext}`,
            });
          }
        }
      }
    }
  }
}
