# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Metadata-driven Venice model catalog loader from generated Venice model snapshots
- `npm run refresh-model-catalogs` script to fetch fresh `image`, `video`, `inpaint`, and `upscale` catalogs from Venice `/models`
- `npm run check-model-catalogs` and `npm run check-model-catalogs:drift` for shape validation and live drift detection
- Initial unit tests for metadata-driven routing and normalization helpers
- Per-model video duration capability map exposed through provider capabilities

### Changed
- Video model selection now auto-switches between text-to-video and image-to-video sibling models when needed
- Image edit selection now resolves edit-capable sibling models (for example `gpt-image-2` → `gpt-image-2-edit`) instead of hardcoding `qwen-edit`
- Image/video option normalization now prefers supported per-model aspect ratios, resolutions, and durations with safer fallback behavior

### Fixed
- Added missing config schema fields for image/video negative prompts, style preset, and output format
- Aligned `defaultVideoDuration` schema default with runtime behavior (`6` seconds)
- Refactored catalog maintenance scripts to avoid OpenClaw install security-scan false positives
- Removed duplicated README content and refreshed configuration docs

## [2.2.0] - 2026-04-28

### Changed
- **Major refactor**: Split monolithic 718-line `index.ts` into modular structure:
  - `src/config.ts` - Shared types and constants
  - `src/image-generation.ts` - Image generation provider (331 lines)
  - `src/video-generation.ts` - Video generation provider (309 lines)
  - `src/index.ts` - Clean entry point (27 lines)
- **Updated default image model** to `flux-2-max` (safer choice)
- **Simplified configuration**: Removed duplicate `defaultImageModel`/`defaultVideoModel` from plugin config
  - Use `agents.defaults.imageGenerationModel.primary` and `agents.defaults.videoGenerationModel.primary` instead
  - Plugin internal defaults only used as fallbacks
- **Fixed ES module compatibility**:
  - Grouped nullish coalescing operators (`||` with `??`) for proper parsing
  - Moved `isProviderApiKeyConfigured` to top-level imports
- **Updated documentation**:
  - Auth command changed to `openclaw models auth paste-token --provider venice`
  - Clearer explanation of config hierarchy

## [2.1.1] - 2026-04-24

### Changed
- Updated documentation (README.md, SKILL.md) with v2.1.0 features
- Added detailed usage examples
- Added model-specific duration tables
- Documented image editing capabilities (pending OpenClaw support)

## [2.1.0] - 2026-04-24

### Added
- **Image editing capabilities** via intent parsing:
  - `remove background` → `/image/background-remove`
  - `upscale` → `/image/upscale`  
  - Other prompts → `/image/edit`
- **Image generation enhancements**:
  - Aspect ratio + resolution support (Nano Banana models)
  - Negative prompts support
  - Style presets support
  - WebP format output (smaller files)
  - Binary response handling for efficiency
- **Video generation enhancements**:
  - Negative prompts support
  - Model-specific duration validation (WAN 2.5: 5s/10s, LTX: 6s-30s)

### Notes
- Image editing requires OpenClaw core support to pass uploaded images
- Plugin code is ready; pending OpenClaw tool interface updates

## [2.0.0] - 2026-04-23

### Added
- **Video generation support** with 80+ models (LTX, WAN, Kling, Veo, Sora, Runway, etc.)
- Async video generation using Venice.ai queue/retrieve API
- Support for text-to-video and image-to-video
- Duration rounding to valid values (6s, 8s, 10s, etc.)
- Aspect ratio detection from size or explicit parameter
- Binary video response handling for completed jobs

### Changed
- **Renamed plugin** from `venice-image` to `venice-media`
- Updated npm package name from `openclaw-venice-ai` to `openclaw-venice-media`
- Default image model changed to `flux-2-max`
- Default video model set to `ltx-2-fast-text-to-video`

### Fixed
- Correct video generation types import from `openclaw/plugin-sdk/video-generation`
- Video provider capabilities structure (`maxVideos`, `maxInputImages`, etc.)
- Duration validation for different models
- Proper model parameter in retrieve/complete API calls

## [1.0.0] - 2026-04-22

### Added
- Initial image generation support
- 30+ Venice.ai image models (flux-2-max, venice-sd35, etc.)
- Venice.ai API integration with bundled auth
- Multiple size support (1024x1024, 1024x1536, etc.)
- Configurable steps, cfg_scale, watermark, safe_mode
- ClawHub release ready

### Technical
- Plugin ID: `venice-image`
- Package name: `openclaw-venice-ai`
- Uses Venice provider auth (shared with text models)
