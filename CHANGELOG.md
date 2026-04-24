# Changelog

All notable changes to this project will be documented in this file.

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
