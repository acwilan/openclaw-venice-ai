/**
 * OpenClaw Venice.ai Media Generation Plugin
 *
 * Provides image and video generation using Venice.ai API
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { PROVIDER_ID, PROVIDER_NAME, PROVIDER_DESCRIPTION, type VeniceConfig } from "./config.js";
import { registerImageGenerationProvider } from "./image-generation.js";
import { registerVideoGenerationProvider } from "./video-generation.js";

export default definePluginEntry({
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  description: PROVIDER_DESCRIPTION,

  register(api: OpenClawPluginApi) {
    const config = api.config as VeniceConfig;

    // Register image generation provider
    registerImageGenerationProvider(api, config);

    // Register video generation provider
    registerVideoGenerationProvider(api, config);
  },
});
