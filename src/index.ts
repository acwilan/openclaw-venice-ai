/**
 * OpenClaw Venice.ai Image Generation Plugin
 *
 * Provides image generation using Venice.ai API
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { isProviderApiKeyConfigured } from "openclaw/plugin-sdk/provider-auth";
import { resolveApiKeyForProvider } from "openclaw/plugin-sdk/provider-auth-runtime";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type {
  ImageGenerationRequest,
  ImageGenerationResult,
  OpenClawConfig,
  OpenClawPluginApi,
} from "openclaw/plugin-sdk";

const PROVIDER_ID = "venice-image";
const PROVIDER_NAME = "Venice.ai Image Generation";
const PROVIDER_DESCRIPTION = "Image generation using Venice.ai API";

const VENICE_API_BASE_URL = "https://api.venice.ai/api/v1";
const DEFAULT_OUTPUT_MIME = "image/png";

// Supported sizes
const VENICE_SUPPORTED_SIZES = [
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "832x1216",
  "1216x832",
  "512x512",
  "512x768",
  "768x512",
] as const;

// Venice.ai image models (from /v1/models?type=image)
const DEFAULT_VENICE_IMAGE_MODEL = "venice-sd35";
const VENICE_IMAGE_MODELS = [
  // Venice native models
  "venice-sd35",
  "hidream",
  // FLUX models
  "flux-2-pro",
  "flux-2-max",
  // GPT Image models
  "gpt-image-1-5",
  "gpt-image-2",
  // Hunyuan models
  "hunyuan-image-v3",
  // ImagineArt models
  "imagineart-1.5-pro",
  // Nano Banana models
  "nano-banana-2",
  "nano-banana-pro",
  // Recraft models
  "recraft-v4",
  "recraft-v4-pro",
  // Seedream models
  "seedream-v4",
  "seedream-v5-lite",
  // Qwen Image models
  "qwen-image",
  "qwen-image-2",
  "qwen-image-2-pro",
  // Wan models
  "wan-2-7-text-to-image",
  "wan-2-7-pro-text-to-image",
  // Grok Imagine models
  "grok-imagine-image",
  "grok-imagine-image-pro",
  // Lustify models
  "lustify-sdxl",
  "lustify-v7",
  "lustify-v8",
  // Other models
  "wai-Illustrious",
  "z-image-turbo",
  "chroma",
  "bria-bg-remover",
] as const;

interface VeniceConfig extends OpenClawConfig {
  apiKey?: string;
  baseUrl?: string;
  outputDir?: string;
  defaultModel?: string;
  defaultSteps?: number;
  defaultCfgScale?: number;
  hideWatermark?: boolean;
  safeMode?: boolean;
}

export default definePluginEntry({
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  description: PROVIDER_DESCRIPTION,

  register(api: OpenClawPluginApi) {
    const config = api.config as VeniceConfig;
    const outputDir = config.outputDir
      ? config.outputDir.replace(/^~\//, homedir() + "/")
      : join(homedir(), "Downloads", "venice-ai-output");

    api.registerImageGenerationProvider({
      id: PROVIDER_ID,
      label: PROVIDER_NAME,

      defaultModel: config.defaultModel ?? DEFAULT_VENICE_IMAGE_MODEL,
      models: [...VENICE_IMAGE_MODELS],

      isConfigured: ({ agentDir }) =>
        isProviderApiKeyConfigured({
          provider: "venice",
          agentDir,
        }),

      capabilities: {
        generate: {
          maxCount: 4,
          supportsSize: true,
          supportsAspectRatio: false,
          supportsResolution: false,
        },
        edit: {
          enabled: false,
          maxCount: 0,
          maxInputImages: 0,
          supportsSize: false,
          supportsAspectRatio: false,
          supportsResolution: false,
        },
        geometry: {
          sizes: [...VENICE_SUPPORTED_SIZES],
        },
      },

      async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
        const { prompt, model, size, count = 1, cfg, agentDir, authStore } = req;

        // Resolve API key from bundled Venice provider auth store
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
        const modelToUse = model || config.defaultModel || DEFAULT_VENICE_IMAGE_MODEL;

        let width = 1024;
        let height = 1024;
        if (size) {
          const [w, h] = size.split("x").map(Number);
          if (w && h) {
            width = w;
            height = h;
          }
        }

        await mkdir(outputDir, { recursive: true });

        const images: Array<{ buffer: Buffer; mimeType: string; fileName: string }> = [];

        for (let i = 0; i < count; i++) {
          const requestBody = {
            model: modelToUse,
            prompt: prompt,
            width: width,
            height: height,
            seed: Math.floor(Math.random() * 999999999),
            cfg_scale: typeof cfg === 'number' ? cfg : (config.defaultCfgScale ?? 7.0),
            steps: config.defaultSteps ?? 30,
            format: "png" as const,
            embed_exif_metadata: false,
            hide_watermark: config.hideWatermark ?? false,
            safe_mode: config.safeMode ?? false,
          };

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
            throw new Error(
              `Venice.ai API error: ${response.status} ${response.statusText} - ${errorText}`
            );
          }

          const data = await response.json() as Record<string, unknown>;

          // Venice format: images[] is array of base64 strings
          if (data.images && Array.isArray(data.images)) {
            for (const img of data.images as string[]) {
              if (typeof img === 'string' && img.length > 0) {
                const buffer = Buffer.from(img, "base64");
                const timestamp = Date.now();
                images.push({
                  buffer,
                  mimeType: DEFAULT_OUTPUT_MIME,
                  fileName: `venice-${timestamp}-${images.length}.png`,
                });
              }
            }
          }

          if (images.length === 0) {
            throw new Error("No images returned from Venice.ai API");
          }
        }

        return {
          images: images.map((img) => ({
            buffer: img.buffer,
            mimeType: img.mimeType,
            fileName: img.fileName,
          })),
          model: modelToUse,
          metadata: { width, height },
        };
      },
    });
  },
});
