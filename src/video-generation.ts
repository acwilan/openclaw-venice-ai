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
  VENICE_VIDEO_SIZES,
  VENICE_API_BASE_URL,
  DEFAULT_VIDEO_MIME,
  type VeniceConfig,
} from "./config.js";
import {
  VENICE_VIDEO_ASPECT_RATIOS,
  VENICE_VIDEO_DURATIONS,
  VENICE_VIDEO_DURATIONS_BY_MODEL,
  VENICE_VIDEO_MODELS,
  VENICE_VIDEO_RESOLUTIONS,
  chooseSupportedAspectRatio,
  chooseSupportedDuration,
  chooseSupportedVideoResolution,
  getAspectRatios,
  getDefaultAspectRatio,
  getDefaultVideoResolution,
  getRawVideoResolutions,
  getVideoDurations,
  getVideoModelMetadata,
  inferAspectRatioFromSize,
  inferRawVideoResolutionFromSize,
  resolveVideoModelForMode,
} from "./model-metadata.js";

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
        supportedDurationSeconds: [...VENICE_VIDEO_DURATIONS],
        supportedDurationSecondsByModel: VENICE_VIDEO_DURATIONS_BY_MODEL,
        sizes: [...VENICE_VIDEO_SIZES],
        aspectRatios: [...VENICE_VIDEO_ASPECT_RATIOS],
        resolutions: [...VENICE_VIDEO_RESOLUTIONS],
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: VENICE_VIDEO_RESOLUTIONS.length > 0,
        supportsAudio: true,
        supportsWatermark: true,
      },
      imageToVideo: {
        enabled: true,
        maxVideos: 1,
        maxInputImages: 1,
        maxDurationSeconds: 60,
        supportedDurationSeconds: [...VENICE_VIDEO_DURATIONS],
        supportedDurationSecondsByModel: VENICE_VIDEO_DURATIONS_BY_MODEL,
        sizes: [...VENICE_VIDEO_SIZES],
        aspectRatios: [...VENICE_VIDEO_ASPECT_RATIOS],
        resolutions: [...VENICE_VIDEO_RESOLUTIONS],
        supportsSize: true,
        supportsAspectRatio: true,
        supportsResolution: VENICE_VIDEO_RESOLUTIONS.length > 0,
        supportsAudio: true,
      },
      videoToVideo: {
        enabled: false,
        maxVideos: 0,
        maxInputImages: 0,
        maxInputVideos: 0,
      },
    },

    async generateVideo(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
      const {
        prompt,
        model,
        size,
        durationSeconds,
        agentDir,
        authStore,
        inputImages,
        aspectRatio,
        resolution,
        audio,
        watermark,
      } = req;

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
      const requestedModel = model || (pluginConfig?.defaultVideoModel ?? config.defaultVideoModel ?? DEFAULT_VIDEO_MODEL);

      const { model: modelToUse, body: requestBody, normalized } = buildVideoQueueRequestBody({
        prompt,
        requestedModel,
        size,
        durationSeconds,
        inputImages,
        aspectRatio,
        resolution,
        audio,
        watermark,
        config,
        negativePrompt,
      });

      await mkdir(outputDir, { recursive: true });

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

      return await pollForVideoCompletion(
        queueId,
        modelToUse,
        baseUrl,
        apiKey,
        normalized.normalizedAspectRatio as string | undefined,
        normalized.normalizedDuration as number,
        outputDir,
        normalized
      );
    },
  });
}

export function buildVideoQueueRequestBody(args: {
  prompt: string;
  requestedModel: string;
  size?: string;
  durationSeconds?: number;
  inputImages?: Array<{ url?: string; buffer?: Buffer }>;
  aspectRatio?: string;
  resolution?: string;
  audio?: boolean;
  watermark?: boolean;
  config: VeniceConfig;
  negativePrompt?: string;
}): { model: string; body: Record<string, unknown>; normalized: Record<string, unknown> } {
  const mode = args.inputImages && args.inputImages.length > 0 ? "image-to-video" : "text-to-video";
  const modelToUse = resolveVideoModelForMode(args.requestedModel, mode);
  const modelConstraints = getVideoModelMetadata(modelToUse)?.model_spec?.constraints;

  const supportedAspectRatios = getAspectRatios(modelConstraints);
  const supportedResolutions = getRawVideoResolutions(modelConstraints);
  const supportedDurations = getVideoDurations(modelConstraints);

  const aspectRatioToUse = chooseSupportedAspectRatio(
    args.aspectRatio ?? inferAspectRatioFromSize(args.size),
    supportedAspectRatios,
    getDefaultAspectRatio(modelConstraints)
  );

  const requestedDuration = args.durationSeconds ?? args.config.defaultVideoDuration ?? 6;
  const videoDuration = chooseSupportedDuration(requestedDuration, supportedDurations) ?? requestedDuration;

  const resolutionToUse = chooseSupportedVideoResolution(
    args.resolution ?? inferRawVideoResolutionFromSize(args.size),
    supportedResolutions,
    getDefaultVideoResolution(modelConstraints)
  );

  const requestBody: Record<string, unknown> = {
    model: modelToUse,
    prompt: args.prompt,
    duration: `${videoDuration}s`,
  };

  if (aspectRatioToUse && supportedAspectRatios.length > 0) {
    requestBody.aspect_ratio = aspectRatioToUse;
  }

  if (resolutionToUse && supportedResolutions.length > 0) {
    requestBody.resolution = resolutionToUse;
  }

  if (args.inputImages && args.inputImages.length > 0) {
    const firstImage = args.inputImages[0];
    if (firstImage.url) {
      requestBody.image_url = firstImage.url;
    } else if (firstImage.buffer) {
      requestBody.image = firstImage.buffer.toString("base64");
    }
  }

  if (args.negativePrompt) {
    requestBody.negative_prompt = args.negativePrompt;
  }

  if (args.audio === true && modelConstraints?.audio) {
    requestBody.audio = true;
  }

  if (typeof args.watermark === "boolean") {
    requestBody.watermark = args.watermark;
  }

  return {
    model: modelToUse,
    body: requestBody,
    normalized: {
      requestedModel: args.requestedModel,
      normalizedModel: modelToUse,
      requestedAspectRatio: args.aspectRatio,
      normalizedAspectRatio: aspectRatioToUse,
      requestedResolution: args.resolution,
      normalizedResolution: resolutionToUse,
      requestedDuration: args.durationSeconds,
      normalizedDuration: videoDuration,
    },
  };
}

async function pollForVideoCompletion(
  queueId: string,
  model: string,
  baseUrl: string,
  apiKey: string,
  aspectRatio: string | undefined,
  duration: number,
  outputDir: string,
  normalized: Record<string, unknown>
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
      const videoBuffer = Buffer.from(await retrieveResponse.arrayBuffer());
      const timestamp = Date.now();

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
        metadata: { aspect_ratio: aspectRatio, duration, normalized, outputDir },
      };
    }

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
        metadata: { aspect_ratio: aspectRatio, duration, normalized, outputDir },
      };
    }

    if (status === "failed") {
      throw new Error(`Video generation failed: ${statusData.error || "Unknown error"}`);
    }
  }

  throw new Error("Video generation timed out");
}
