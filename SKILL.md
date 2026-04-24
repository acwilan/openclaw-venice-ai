# SKILL.md - Venice.ai Media Generation

## Overview

This plugin provides image and video generation capabilities for OpenClaw using the Venice.ai API.

**Plugin ID:** `venice-media`
**Provider Type:** Image + Video Generation
**Auth Method:** OpenClaw bundled Venice provider
**Version:** 2.1.0

## Authentication

**Required Setup:**

1. Obtain a Venice.ai API key from https://venice.ai/settings/api
2. Configure the key in OpenClaw:
   ```bash
   openclaw models auth setup-token --provider venice
   ```
3. Enter your API key when prompted

**Note:** The plugin uses the same Venice provider as text models. You only need to set up the API key once.

## Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "venice-media": {
        "enabled": true,
        "config": {
          "defaultImageModel": "lustify-v8",
          "defaultVideoModel": "ltx-2-19b-distilled-text-to-video",
          "defaultImageSteps": 30,
          "defaultImageCfgScale": 7.0,
          "defaultVideoDuration": 6,
          "defaultNegativePrompt": "blurry, low quality",
          "defaultStylePreset": "3D Model",
          "defaultOutputFormat": "webp",
          "hideWatermark": false,
          "safeMode": false,
          "outputDir": "~/Downloads/venice-ai-output"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "imageGenerationModel": {
        "primary": "venice-media/lustify-v8"
      },
      "videoGenerationModel": {
        "primary": "venice-media/ltx-2-19b-distilled-text-to-video"
      }
    }
  }
}
```

### Config Options Reference

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `defaultImageModel` | string | `lustify-v8` | - | Default image generation model |
| `defaultVideoModel` | string | `ltx-2-19b-distilled-text-to-video` | - | Default video generation model |
| `defaultImageSteps` | number | `30` | 1-50 | Inference steps for images |
| `defaultImageCfgScale` | number | `7.0` | 1.0-20.0 | Guidance scale for images |
| `defaultVideoDuration` | number | `6` | 6,8,10,12,14,15,16,18,20,30 | Video duration in seconds |
| `defaultNegativePrompt` | string | — | - | Negative prompt for image/video |
| `defaultStylePreset` | string | — | - | Style preset for images |
| `defaultOutputFormat` | string | `webp` | webp/png/jpeg | Output format |
| `hideWatermark` | boolean | `false` | - | Hide Venice.ai watermark |
| `safeMode` | boolean | `false` | - | Enable content filtering |
| `outputDir` | string | `~/Downloads/venice-ai-output` | - | Output directory for media |

## Usage

### Image Generation

Basic usage:
```
Generate an image of a sunset over mountains
```

With style preset:
```
Generate an image in 3D Model style of a sports car
```

With negative prompt:
```
Generate an image of a beach without people, without clouds
```

With size:
```
Generate a 512x512 image of a cat
```

### Video Generation

Basic usage:
```
Generate a video of waves crashing on a beach
```

With resolution:
```
Generate a 480P video of a waterfall
```

With negative prompt:
```
Generate a video of a car driving, no blurry motion
```

### Image-to-Video

Send an image first, then:
```
Generate a video from this image of the Mona Lisa smiling
```

### Image Editing (Intent-Based)

**Note:** Image editing requires OpenClaw core support to pass uploaded images to the plugin. The plugin code is ready and will activate when supported.

The plugin parses your prompt to determine the editing operation:

**Remove background:**
```
Remove background from this image
```
→ Routes to `/image/background-remove`

**Upscale:**
```
Upscale this image
```
→ Routes to `/image/upscale` with scale=2, enhance=true

**General edit:**
```
Add sunglasses to the person in this image
```
→ Routes to `/image/edit` with qwen-edit model

## Model Lists

### Image Models (included in plugin)

- `lustify-v8` - Default, good quality
- `flux-2-max` - High quality
- `flux-2-pro` - Professional quality
- `venice-sd35` - Stable Diffusion 3.5
- `gpt-image-2` - GPT Image 2
- `recraft-v4-pro` - Recraft v4 Pro
- `wan-2-7-text-to-image` - WAN for images
- And 25+ more

### Video Models (included in plugin)

- `ltx-2-19b-distilled-text-to-video` - Default, fast, small files
- `ltx-2-fast-text-to-video` - Fast generation
- `ltx-2-full-text-to-video` - Higher quality
- `wan-2-7-text-to-video` - WAN 2.7
- `wan-2.5-preview-text-to-video` - WAN 2.5 with 480P
- `seedance-2-0-text-to-video` - Seedance 2.0
- `kling-2.6-pro-text-to-video` - Kling 2.6 Pro
- And 70+ more

## Model-Specific Features

### Image Models

| Feature | Description |
|---------|-------------|
| **Aspect Ratio** | Some models (Nano Banana) use `aspect_ratio` + `resolution` instead of width/height |
| **Width/Height** | Traditional sizing for most models |
| **Style Presets** | Apply artistic styles via `style_preset` |
| **Negative Prompts** | Exclude unwanted elements |
| **WebP Format** | Smaller file sizes, better for Telegram |

### Video Models - Duration Support

| Model | Supported Durations | Notes |
|-------|---------------------|-------|
| WAN 2.5 | 5s, 10s | Supports 480P, best for Telegram |
| WAN 2.7 | 5s, 10s, 15s | High quality |
| LTX (all) | 6s, 8s, 10s, 12s, 14s, 15s, 16s, 18s, 20s, 30s | Fast, reliable, stays under 5MB |

## Technical Details

### Image Generation

- **Max images per request:** 4
- **Supported sizes:** 1024x1024, 1024x1536, 1536x1024, 832x1216, 1216x832, 512x512, 512x768, 768x512
- **Formats:** WebP (default), PNG, JPEG
- **API endpoint:** POST /image/generate
- **Response:** Binary (with `return_binary: true`) or base64 JSON

### Image Editing

- **Background Removal:** POST /image/background-remove
- **Upscale:** POST /image/upscale (scale 1-4x, optional enhance)
- **Edit:** POST /image/edit (qwen-edit model)
- **Response:** Binary PNG

### Video Generation

- **Max videos per request:** 1
- **Supported aspect ratios:** 16:9, 9:16, 1:1, 4:3, 3:4
- **Supported durations:** Model-specific (see table above)
- **Format:** MP4
- **API endpoints:**
  - POST /video/quote - Price check
  - POST /video/queue - Queue generation
  - POST /video/retrieve - Poll/download
  - POST /video/complete - Cleanup

## Limitations

1. **Telegram 5MB limit:** Large images and videos may exceed Telegram's file size limit. Use:
   - Smaller image sizes (512x512)
   - Lower video resolutions (480P)
   - Shorter video durations
   - Distilled models for smaller files

2. **Video duration rounding:** The plugin automatically rounds to valid values per model

3. **Image Editing:** Requires OpenClaw core support to pass uploaded images. Plugin code is ready.

## Version History

- **v2.1.0** - Image editing (ready), negative prompts, style presets, WebP format, model-specific durations
- **v2.0.0** - Video generation, renamed to venice-media
- **v1.0.0** - Initial image generation

## Links

- **GitHub:** https://github.com/acwilan/openclaw-venice-ai
- **Releases:** https://github.com/acwilan/openclaw-venice-ai/releases
- **Venice.ai:** https://venice.ai
- **Venice Docs:** https://docs.venice.ai
