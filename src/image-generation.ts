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
  VENICE_SUPPORTED_SIZES,
  VENICE_API_BASE_URL,
  type VeniceConfig,
} from "./config.js";
import {
  DEFAULT_UPSCALE_MODEL,
  VENICE_IMAGE_ASPECT_RATIOS,
  VENICE_IMAGE_MODELS,
  VENICE_IMAGE_RESOLUTIONS,
  chooseSupportedAspectRatio,
  chooseSupportedImageResolution,
  getAspectRatios,
  getDefaultAspectRatio,
  getDefaultImageResolution,
  getImageEditAspectRatios,
  getImageModelMetadata,
  getImageResolutions,
  inferAspectRatioFromSize,
  normalizeImageSize,
  resolveImageEditModel,
  type VeniceImageResolution,
} from "./model-metadata.js";

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
        supportsResolution: VENICE_IMAGE_RESOLUTIONS.length > 0,
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
        aspectRatios: [...VENICE_IMAGE_ASPECT_RATIOS],
        resolutions: [...VENICE_IMAGE_RESOLUTIONS],
      },
    },

    async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
      const { prompt, model, size, aspectRatio, resolution, count = 1, agentDir, authStore } = req;

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

      let actualModel = modelToUse;

      if (isEdit) {
        actualModel = await handleImageEdit(
          inputImages[0],
          prompt,
          modelToUse,
          size,
          aspectRatio,
          baseUrl,
          apiKey,
          images,
          editIntent
        );
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

      return { images, model: actualModel };
    },
  });
}

async function handleImageEdit(
  firstImage: { buffer?: Buffer; url?: string },
  prompt: string,
  requestedModel: string,
  size: string | undefined,
  aspectRatio: string | undefined,
  baseUrl: string,
  apiKey: string,
  images: Array<{ buffer: Buffer; mimeType: string; fileName: string }>,
  editIntent: "edit" | "removeBackground" | "upscale"
): Promise<string> {
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
    return "bria-bg-remover";
  }

  if (editIntent === "upscale") {
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
    return DEFAULT_UPSCALE_MODEL;
  }

  const { model: editModel, body: requestBody } = buildImageEditRequestBody({
    prompt,
    requestedModel,
    size,
    aspectRatio,
    imageBase64,
  });

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
  return editModel;
}

export function buildImageEditRequestBody(args: {
  prompt: string;
  requestedModel: string;
  size?: string;
  aspectRatio?: string;
  imageBase64: string;
}): { model: string; body: Record<string, unknown> } {
  const editModel = resolveImageEditModel(args.requestedModel);
  const supportedAspectRatios = getImageEditAspectRatios(editModel);
  const aspectRatioToUse = chooseSupportedAspectRatio(
    args.aspectRatio ?? inferAspectRatioFromSize(args.size),
    supportedAspectRatios,
    supportedAspectRatios.includes("auto") ? "auto" : getDefaultAspectRatio({ aspectRatios: supportedAspectRatios })
  );

  const body: Record<string, unknown> = {
    model: editModel,
    prompt: args.prompt,
    safe_mode: false,
    image: args.imageBase64,
  };

  if (aspectRatioToUse) {
    body.aspect_ratio = aspectRatioToUse;
  }

  return { model: editModel, body };
}

export function buildImageGenerationRequestBody(args: {
  prompt: string;
  modelToUse: string;
  size?: string;
  aspectRatio?: string;
  resolution?: VeniceImageResolution;
  config: VeniceConfig;
  negativePrompt?: string;
  stylePreset?: string;
  outputFormat: string;
  seed?: number;
}): Record<string, unknown> {
  const modelConstraints = getImageModelMetadata(args.modelToUse)?.model_spec?.constraints;
  const supportedAspectRatios = getAspectRatios(modelConstraints);
  const supportedResolutions = getImageResolutions(modelConstraints);
  const aspectRatioToUse = chooseSupportedAspectRatio(
    args.aspectRatio ?? inferAspectRatioFromSize(args.size),
    supportedAspectRatios,
    getDefaultAspectRatio(modelConstraints)
  );
  const resolutionToUse = chooseSupportedImageResolution(
    args.resolution,
    supportedResolutions,
    getDefaultImageResolution(modelConstraints)
  );
  const divisor = modelConstraints?.widthHeightDivisor ?? 1;

  const requestBody: Record<string, unknown> = {
    model: args.modelToUse,
    prompt: args.prompt,
    seed: args.seed ?? Math.floor(Math.random() * 999999999),
    cfg_scale: args.config.defaultImageCfgScale ?? 7.0,
    steps: args.config.defaultImageSteps ?? 30,
    format: args.outputFormat === "jpeg" ? "jpg" : args.outputFormat,
    embed_exif_metadata: false,
    hide_watermark: args.config.hideWatermark ?? false,
    safe_mode: args.config.safeMode ?? false,
    return_binary: true,
  };

  if (aspectRatioToUse && supportedAspectRatios.length > 0) {
    requestBody.aspect_ratio = aspectRatioToUse;
    if (resolutionToUse && supportedResolutions.length > 0) {
      requestBody.resolution = resolutionToUse;
    }
  } else {
    const normalizedSize = normalizeImageSize(args.size, divisor);
    requestBody.width = normalizedSize.width;
    requestBody.height = normalizedSize.height;
  }

  if (args.negativePrompt) {
    requestBody.negative_prompt = args.negativePrompt;
  }
  if (args.stylePreset) {
    requestBody.style_preset = args.stylePreset;
  }

  return requestBody;
}

async function handleImageGeneration(
  prompt: string,
  modelToUse: string,
  size: string | undefined,
  aspectRatio: string | undefined,
  resolution: VeniceImageResolution | undefined,
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
    const requestBody = buildImageGenerationRequestBody({
      prompt,
      modelToUse,
      size,
      aspectRatio,
      resolution,
      config,
      negativePrompt,
      stylePreset,
      outputFormat,
    });

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
