/**
 * OpenClaw Venice.ai Media Generation Plugin
 *
 * Provides image and video generation using Venice.ai API
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
import type {
  VideoGenerationRequest,
  VideoGenerationResult,
} from "openclaw/plugin-sdk/video-generation";

const PROVIDER_ID = "venice-media";
const PROVIDER_NAME = "Venice.ai Media Generation";
const PROVIDER_DESCRIPTION = "Image and video generation using Venice.ai API";

const VENICE_API_BASE_URL = "https://api.venice.ai/api/v1";
const DEFAULT_OUTPUT_MIME = "image/png";
const DEFAULT_VIDEO_MIME = "video/mp4";

// Supported sizes for images
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

// Video supported sizes
const VENICE_VIDEO_SIZES = [
  "1024x576",  // 16:9
  "576x1024",  // 9:16
  "768x768",   // 1:1
  "1024x1024", // 1:1
] as const;

// Venice.ai image models
const DEFAULT_IMAGE_MODEL = "flux-2-max";
const VENICE_IMAGE_MODELS = [
  "venice-sd35", "hidream", "flux-2-pro", "flux-2-max",
  "gpt-image-1-5", "gpt-image-2", "hunyuan-image-v3", "imagineart-1.5-pro",
  "nano-banana-2", "nano-banana-pro", "recraft-v4", "recraft-v4-pro",
  "seedream-v4", "seedream-v5-lite", "qwen-image", "qwen-image-2", "qwen-image-2-pro",
  "wan-2-7-text-to-image", "wan-2-7-pro-text-to-image",
  "grok-imagine-image", "grok-imagine-image-pro",
  "lustify-sdxl", "lustify-v7", "lustify-v8",
  "wai-Illustrious", "z-image-turbo", "chroma", "bria-bg-remover",
] as const;

// Venice.ai video models
const DEFAULT_VIDEO_MODEL = "ltx-2-fast-text-to-video";
const VENICE_VIDEO_MODELS = [
  "ltx-2-fast-text-to-video", "ltx-2-fast-image-to-video",
  "ltx-2-full-text-to-video", "ltx-2-full-image-to-video",
  "longcat-distilled-text-to-video", "longcat-distilled-image-to-video",
  "wan-2-7-text-to-video", "wan-2-7-image-to-video",
  "seedance-2-0-text-to-video", "seedance-2-0-image-to-video",
  "kling-2.6-pro-text-to-video", "kling-2.6-pro-image-to-video",
  "veo3-fast-text-to-video", "veo3-fast-image-to-video",
  "sora-2-text-to-video", "sora-2-image-to-video",
  "runway-gen4-turbo", "runway-gen4-5-text",
  "grok-imagine-text-to-video", "grok-imagine-image-to-video",
  "pixverse-v5.6-text-to-video", "pixverse-v5.6-image-to-video",
] as const;

interface VeniceConfig extends OpenClawConfig {
  apiKey?: string;
  baseUrl?: string;
  outputDir?: string;
  defaultImageModel?: string;
  defaultVideoModel?: string;
  defaultImageSteps?: number;
  defaultImageCfgScale?: number;
  defaultVideoDuration?: number;
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

    // Register Image Generation Provider
    api.registerImageGenerationProvider({
      id: PROVIDER_ID,
      label: PROVIDER_NAME,

      defaultModel: config.defaultImageModel ?? DEFAULT_IMAGE_MODEL,
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
        const modelToUse = model || config.defaultImageModel || DEFAULT_IMAGE_MODEL;

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
            cfg_scale: typeof cfg === 'number' ? cfg : (config.defaultImageCfgScale ?? 7.0),
            steps: config.defaultImageSteps ?? 30,
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

    // Register Video Generation Provider
    api.registerVideoGenerationProvider({
      id: PROVIDER_ID,
      label: PROVIDER_NAME,

      defaultModel: config.defaultVideoModel ?? DEFAULT_VIDEO_MODEL,
      models: [...VENICE_VIDEO_MODELS],

      isConfigured: ({ agentDir }) =>
        isProviderApiKeyConfigured({
          provider: "venice",
          agentDir,
        }),

      capabilities: {
        generate: {
          maxVideos: 1,
          maxInputImages: 1,
          maxInputVideos: 0,
          maxDurationSeconds: 60,
          supportedDurationSeconds: [5, 10, 15, 30, 60],
          sizes: [...VENICE_VIDEO_SIZES],
          aspectRatios: ["16:9", "9:16", "1:1"],
          supportsSize: true,
          supportsAspectRatio: true,
          supportsResolution: false,
          supportsAudio: false,
          supportsWatermark: true,
        },
        imageToVideo: {
          enabled: true,
          maxVideos: 1,
          maxInputImages: 1,
          maxInputVideos: 0,
          maxDurationSeconds: 60,
          supportedDurationSeconds: [5, 10, 15, 30, 60],
          sizes: [...VENICE_VIDEO_SIZES],
          aspectRatios: ["16:9", "9:16", "1:1"],
          supportsSize: true,
          supportsAspectRatio: true,
          supportsResolution: false,
        },
        videoToVideo: {
          enabled: false,
          maxVideos: 0,
          maxInputImages: 0,
          maxInputVideos: 0,
        },
      },

      async generateVideo(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
        const { prompt, model, size, durationSeconds, agentDir, authStore, inputImages, aspectRatio } = req;

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
        const modelToUse = model || config.defaultVideoModel || DEFAULT_VIDEO_MODEL;

        // Determine aspect ratio from size or use provided aspectRatio
        let aspectRatioToUse = "16:9";
        if (aspectRatio) {
          aspectRatioToUse = aspectRatio;
        } else if (size) {
          const [w, h] = size.split("x").map(Number);
          if (w && h) {
            const ratio = w / h;
            if (Math.abs(ratio - 16/9) < 0.1) aspectRatioToUse = "16:9";
            else if (Math.abs(ratio - 9/16) < 0.1) aspectRatioToUse = "9:16";
            else if (Math.abs(ratio - 1) < 0.1) aspectRatioToUse = "1:1";
            else if (Math.abs(ratio - 4/3) < 0.1) aspectRatioToUse = "4:3";
            else if (Math.abs(ratio - 3/4) < 0.1) aspectRatioToUse = "3:4";
          }
        }

        // Venice durations must be specific values - round to nearest valid
        // Use 6s minimum (works for LTX: 6/8/10/12/14/16/18/20 and longcat: 6/8/10/12/14/16/18/20)
        const requestedDuration = durationSeconds || config.defaultVideoDuration || 6;
        const validDurations = [6, 8, 10, 12, 14, 15, 16, 18, 20, 30];
        const videoDuration = validDurations.reduce((prev, curr) => 
          Math.abs(curr - requestedDuration) < Math.abs(prev - requestedDuration) ? curr : prev
        );
        const durationStr = `${videoDuration}s`;

        await mkdir(outputDir, { recursive: true });

        // Build request body for /video/queue
        const requestBody: Record<string, unknown> = {
          model: modelToUse,
          prompt: prompt,
          aspect_ratio: aspectRatioToUse,
          duration: durationStr,
        };

        // Handle image-to-video if reference images provided
        if (inputImages && inputImages.length > 0) {
          const firstImage = inputImages[0];
          if (firstImage.url) {
            requestBody.image_url = firstImage.url;
          } else if (firstImage.buffer) {
            requestBody.image = firstImage.buffer.toString('base64');
          }
        }

        // Queue the video generation
        const queueResponse = await fetch(`${baseUrl}/video/queue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!queueResponse.ok) {
          const errorText = await queueResponse.text();
          throw new Error(
            `Venice.ai video queue error: ${queueResponse.status} ${queueResponse.statusText} - ${errorText}`
          );
        }

        const queueData = await queueResponse.json() as Record<string, unknown>;
        const queueId = queueData.queue_id as string;

        if (!queueId) {
          throw new Error("No queue ID returned from Venice.ai API");
        }

        // Poll for completion using /video/retrieve
        const maxAttempts = 120;
        const pollInterval = 5000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          const retrieveResponse = await fetch(`${baseUrl}/video/retrieve`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ 
              queue_id: queueId,
              model: modelToUse,
            }),
          });

          if (!retrieveResponse.ok) {
            continue;
          }

          // Check if response is binary video data (completed) or JSON status
          const contentType = retrieveResponse.headers.get("content-type") || "";
          
          if (contentType.includes("video/") || contentType.includes("application/octet-stream")) {
            // Video is ready - response is the binary video file
            const videoBuffer = Buffer.from(await retrieveResponse.arrayBuffer());
            const timestamp = Date.now();
            
            // Call /video/complete to delete stored media
            try {
              await fetch(`${baseUrl}/video/complete`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ 
                  queue_id: queueId,
                  model: modelToUse,
                }),
              });
            } catch {}
            
            return {
              videos: [{
                buffer: videoBuffer,
                mimeType: DEFAULT_VIDEO_MIME,
                fileName: `venice-video-${timestamp}.mp4`,
              }],
              model: modelToUse,
              metadata: { aspect_ratio: aspectRatioToUse, duration: videoDuration },
            };
          }

          // Response is JSON status
          const statusData = await retrieveResponse.json() as Record<string, unknown>;
          const status = statusData.status as string;

          if (status === "completed") {
            const videoUrl = statusData.video_url as string;
            const videoData = statusData.video as string;
            
            let videoBuffer: Buffer;
            
            if (videoData) {
              videoBuffer = Buffer.from(videoData, "base64");
            } else if (videoUrl) {
              const videoResponse = await fetch(videoUrl);
              if (!videoResponse.ok) {
                throw new Error(`Failed to download video: ${videoResponse.status}`);
              }
              videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
            } else {
              throw new Error("Video completed but no data returned");
            }
            
            const timestamp = Date.now();
            
            // Call /video/complete to delete stored media
            try {
              await fetch(`${baseUrl}/video/complete`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ 
                  queue_id: queueId,
                  model: modelToUse,
                }),
              });
            } catch {}
            
            return {
              videos: [{
                buffer: videoBuffer,
                mimeType: DEFAULT_VIDEO_MIME,
                fileName: `venice-video-${timestamp}.mp4`,
              }],
              model: modelToUse,
              metadata: { aspect_ratio: aspectRatioToUse, duration: videoDuration },
            };
          }

          if (status === "failed") {
            throw new Error(`Video generation failed: ${statusData.error || "Unknown error"}`);
          }
        }

        throw new Error("Video generation timed out");
      },
    });
  },
});
