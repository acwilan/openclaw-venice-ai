/**
 * Venice.ai Video Generation Provider
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveApiKeyForProvider } from "openclaw/plugin-sdk/provider-auth-runtime";
import { isProviderApiKeyConfigured } from "openclaw/plugin-sdk/provider-auth";
import type {
  OpenClawPluginApi,
} from "openclaw/plugin-sdk";
import type {
  VideoGenerationRequest,
  VideoGenerationResult,
} from "openclaw/plugin-sdk/video-generation";
import {
  PROVIDER_ID,
  PROVIDER_NAME,
  DEFAULT_VIDEO_MODEL,
  VENICE_VIDEO_MODELS,
  VENICE_VIDEO_SIZES,
  VENICE_API_BASE_URL,
  DEFAULT_VIDEO_MIME,
  type VeniceConfig,
} from "./config.js";

export function registerVideoGenerationProvider(api: OpenClawPluginApi, config: VeniceConfig): void {
  const outputDir = config.outputDir
    ? config.outputDir.replace(/^~\//, homedir() + "/")
    : join(homedir(), "Downloads", "venice-ai-output");

  api.registerVideoGenerationProvider({
    id: PROVIDER_ID,
    label: PROVIDER_NAME,

    defaultModel: config.defaultVideoModel ?? DEFAULT_VIDEO_MODEL,
    models: [...VENICE_VIDEO_MODELS],

    isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
        provider: "venice",
        agentDir,
      }),

    capabilities: {
      generate: {
        maxVideos: 1,
        maxDurationSeconds: 60,
        supportedDurationSeconds: [5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 30, 60],
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

      // Access runtime config
      const pluginConfig = req.cfg?.plugins?.entries?.[PROVIDER_ID]?.config as VeniceConfig | undefined;
      const negativePrompt = pluginConfig?.defaultVideoNegativePrompt ?? config.defaultVideoNegativePrompt;

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
      const modelToUse = model || (pluginConfig?.defaultVideoModel ?? config.defaultVideoModel ?? DEFAULT_VIDEO_MODEL);

      // Determine aspect ratio
      let aspectRatioToUse = "16:9";
      if (aspectRatio) {
        aspectRatioToUse = aspectRatio;
      } else if (size) {
        const [w, h] = size.split("x").map(Number);
        if (w && h) {
          const ratio = w / h;
          if (Math.abs(ratio - 16 / 9) < 0.1) aspectRatioToUse = "16:9";
          else if (Math.abs(ratio - 9 / 16) < 0.1) aspectRatioToUse = "9:16";
          else if (Math.abs(ratio - 1) < 0.1) aspectRatioToUse = "1:1";
        }
      }

      // Determine duration
      const requestedDuration = durationSeconds || config.defaultVideoDuration || 6;
      const videoDuration = getValidDuration(modelToUse, requestedDuration);
      const durationStr = `${videoDuration}s`;

      await mkdir(outputDir, { recursive: true });

      // Build request
      const requestBody: Record<string, unknown> = {
        model: modelToUse,
        prompt,
        aspect_ratio: aspectRatioToUse,
        duration: durationStr,
      };

      if (inputImages && inputImages.length > 0) {
        const firstImage = inputImages[0];
        if (firstImage.url) {
          requestBody.image_url = firstImage.url;
        } else if (firstImage.buffer) {
          requestBody.image = firstImage.buffer.toString("base64");
        }
      }

      if (negativePrompt) {
        requestBody.negative_prompt = negativePrompt;
      }

      // Queue the video
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
        throw new Error(`Venice.ai video queue error: ${queueResponse.status} - ${errorText}`);
      }

      const queueData = await queueResponse.json() as Record<string, unknown>;
      const queueId = queueData.queue_id as string;

      if (!queueId) {
        throw new Error("No queue ID returned from Venice.ai API");
      }

      // Poll for completion
      return await pollForVideoCompletion(
        queueId,
        modelToUse,
        baseUrl,
        apiKey,
        aspectRatioToUse,
        videoDuration,
        outputDir
      );
    },
  });
}

function getValidDuration(model: string, requested: number): number {
  let validDurations: number[];
  
  if (model.includes("wan-2.5")) {
    validDurations = [5, 10];
  } else if (model.includes("wan-2.7") || model.includes("wan-2.6")) {
    validDurations = [5, 10, 15];
  } else {
    validDurations = [6, 8, 10, 12, 14, 15, 16, 18, 20, 30];
  }

  return validDurations.reduce((prev, curr) =>
    Math.abs(curr - requested) < Math.abs(prev - requested) ? curr : prev
  );
}

async function pollForVideoCompletion(
  queueId: string,
  model: string,
  baseUrl: string,
  apiKey: string,
  aspectRatio: string,
  duration: number,
  outputDir: string
): Promise<VideoGenerationResult> {
  const maxAttempts = 120;
  const pollInterval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const retrieveResponse = await fetch(`${baseUrl}/video/retrieve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ queue_id: queueId, model }),
    });

    if (!retrieveResponse.ok) {
      continue;
    }

    const contentType = retrieveResponse.headers.get("content-type") || "";

    if (contentType.includes("video/") || contentType.includes("application/octet-stream")) {
      // Video is ready - binary response
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
          body: JSON.stringify({ queue_id: queueId, model }),
        });
      } catch {}

      return {
        videos: [{
          buffer: videoBuffer,
          mimeType: DEFAULT_VIDEO_MIME,
          fileName: `venice-video-${timestamp}.mp4`,
        }],
        model,
        metadata: { aspect_ratio: aspectRatio, duration },
      };
    }

    // JSON status response
    const statusData = await retrieveResponse.json() as Record<string, unknown>;
    const status = statusData.status as string;

    if (status === "completed") {
      const videoData = statusData.video as string;
      const videoUrl = statusData.video_url as string;

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

      // Call /video/complete
      try {
        await fetch(`${baseUrl}/video/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ queue_id: queueId, model }),
        });
      } catch {}

      return {
        videos: [{
          buffer: videoBuffer,
          mimeType: DEFAULT_VIDEO_MIME,
          fileName: `venice-video-${timestamp}.mp4`,
        }],
        model,
        metadata: { aspect_ratio: aspectRatio, duration },
      };
    }

    if (status === "failed") {
      throw new Error(`Video generation failed: ${statusData.error || "Unknown error"}`);
    }
  }

  throw new Error("Video generation timed out");
}
