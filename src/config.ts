/**
 * Venice.ai Plugin Configuration
 * Shared types and constants
 */

import type { OpenClawConfig } from "openclaw/plugin-sdk";

export const PROVIDER_ID = "venice-media";
export const PROVIDER_NAME = "Venice.ai Media Generation";
export const PROVIDER_DESCRIPTION = "Image and video generation using Venice.ai API";

export const VENICE_API_BASE_URL = "https://api.venice.ai/api/v1";
export const DEFAULT_IMAGE_MIME = "image/png";
export const DEFAULT_VIDEO_MIME = "video/mp4";

// Supported sizes for images
export const VENICE_SUPPORTED_SIZES = [
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
export const VENICE_VIDEO_SIZES = [
  "1024x576",  // 16:9
  "576x1024",  // 9:16
  "768x768",   // 1:1
  "1024x1024", // 1:1
] as const;

// Default models
export const DEFAULT_IMAGE_MODEL = "flux-2-max";
export const DEFAULT_VIDEO_MODEL = "ltx-2-fast-text-to-video";

// Venice.ai image models
export const VENICE_IMAGE_MODELS = [
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
export const VENICE_VIDEO_MODELS = [
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

export interface VeniceConfig extends OpenClawConfig {
  apiKey?: string;
  baseUrl?: string;
  outputDir?: string;
  defaultImageModel?: string;
  defaultVideoModel?: string;
  defaultImageSteps?: number;
  defaultImageCfgScale?: number;
  defaultVideoDuration?: number;
  defaultVideoFps?: number;
  hideWatermark?: boolean;
  safeMode?: boolean;
  // Image generation options
  defaultNegativePrompt?: string;
  defaultStylePreset?: string;
  defaultOutputFormat?: "webp" | "png" | "jpeg";
  // Video generation options
  defaultVideoNegativePrompt?: string;
}
