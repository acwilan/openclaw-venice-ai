# OpenClaw Venice.ai Media Plugin

Image and video generation for OpenClaw using [Venice.ai](https://venice.ai) API.

## Features

- 🎨 **Image generation** via Venice.ai API (30+ models)
- 🖼️ **Image editing** - Remove background, upscale, edit existing images (via intent parsing)
- 🎬 **Video generation** via Venice.ai API (80+ models)
- 🎞️ **Image-to-video** - Generate videos from uploaded images
- 🔐 **Uses bundled Venice auth** — shares API key with Venice text models
- 📐 **Multiple sizes** — various aspect ratios for images and video
- ⏱️ **Video duration control** — Model-specific validation
- 🎭 **Style presets & negative prompts** — Fine-tuned control
- 📦 **WebP format** — Smaller file sizes for Telegram

## Prerequisites

- **Venice.ai API key** — get one at https://venice.ai/settings/api
- **OpenClaw configured** with Venice provider auth

## Installation

### From ClawHub (recommended):

```bash
openclaw plugins install openclaw-venice-media
```

### From source:

```bash
git clone https://github.com/acwilan/openclaw-venice-ai.git
cd openclaw-venice-ai
npm install
npm run build
openclaw plugins install "$(pwd)"
```

## Authentication

This plugin uses the **bundled Venice provider** for authentication. You need to set up your Venice API key once:

```bash
openclaw models auth paste-token --provider venice
```

Enter your Venice.ai API key when prompted. This same key is used for both text and media generation.

## Configuration

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "venice-media": {
        "enabled": true,
        "config": {
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
        "primary": "venice-media/flux-2-max"
      },
      "videoGenerationModel": {
        "primary": "venice-media/ltx-2-fast-text-to-video"
      }
    }
  }
}
```

**Note:** The `primary` model in `agents.defaults` is what OpenClaw uses when you request image/video generation. The plugin also has internal defaults (`flux-2-max` for images, `ltx-2-fast-text-to-video` for video) that only apply if OpenClaw calls the plugin without specifying a model.

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultImageSteps` | number | `30` | Image inference steps (1-50) |
| `defaultImageCfgScale` | number | `7.0` | Image guidance scale (1.0-20.0) |
| `defaultVideoDuration` | number | `6` | Video duration in seconds |
| `defaultNegativePrompt` | string | — | Exclude unwanted elements |
| `defaultStylePreset` | string | — | Apply artistic style |
| `defaultOutputFormat` | string | `webp` | Output format: webp/png/jpeg |
| `hideWatermark` | boolean | `false` | Hide Venice.ai watermark |
| `safeMode` | boolean | `false` | Enable content filtering |
| `outputDir` | string | `~/Downloads/venice-ai-output` | Where to save generated media |

## Usage

### Image Generation

```
Generate an image of a sunset over mountains
```

With specific options:
```
Generate a 512x512 image of a cat in 3D Model style
```

### Video Generation

```
Generate a video of waves crashing on a beach
```

With resolution:
```
Generate a 480P video of a waterfall
```

### Image-to-Video

Send an image, then:
```
Generate a video from this image of a cat playing
```

**Note:** Image-to-video works by uploading an image first, then requesting video generation.

### Image Editing (via intent)

The plugin parses your prompt to determine the editing operation:

**Remove background:**
```
Remove background from this image
```

**Upscale:**
```
Upscale this image
```

**General edit:**
```
Add sunglasses to the person in this image
```

**Note:** Image editing requires OpenClaw core support to pass uploaded images to the plugin.

## Available Models

### Image Models

Popular models include:
- `flux-2-max` - High quality
- `flux-2-pro` - Professional quality
- `venice-sd35` - Stable Diffusion 3.5
- `recraft-v4-pro` - Recraft v4 Pro
- ... and 25+ more

### Video Models

Popular models include:
- `ltx-2-19b-distilled-text-to-video` - Default, fast, small files
- `ltx-2-fast-text-to-video` - Fast generation
- `ltx-2-full-text-to-video` - Higher quality
- `wan-2-7-text-to-video` - WAN 2.7
- `seedance-2-0-text-to-video` - Seedance 2.0
- ... and 70+ more

See Venice.ai docs for full list: https://venice.ai/docs

## Model-Specific Features

### Image Models

| Feature | Supported Models | Notes |
|---------|------------------|-------|
| Aspect Ratio | Nano Banana family | Use `aspect_ratio` + `resolution` |
| Width/Height | Most models | Traditional sizing |
| Style Presets | Most models | See `GET /image/styles` |
| Negative Prompts | Most models | Exclude unwanted elements |

### Video Models

| Model | Durations | Notes |
|-------|-----------|-------|
| WAN 2.5 | 5s, 10s | Supports 480P |
| WAN 2.7 | 5s, 10s, 15s | High quality |
| LTX (all) | 6s-30s | Fast, reliable |

## Important Notes

1. **API Key Required:** You must obtain a Venice.ai API key from https://venice.ai/settings/api and configure it via `openclaw models auth paste-token --provider venice`

2. **Model Availability:** Venice.ai regularly adds new models. The plugin includes popular models but may not list every available model. Check Venice.ai documentation for the complete list.

3. **File Size Limits:** 
   - Telegram has a 5MB limit for media
   - Use smaller sizes (512x512) for images
   - Use 480P resolution for videos
   - Use distilled models for smaller video files

4. **Duration Validation:** Video durations are model-specific. The plugin automatically rounds to valid values.

5. **Image Editing:** The plugin code supports image editing (remove background, upscale, edit) but requires OpenClaw core updates to pass uploaded images to the plugin.

## Version History

- **v2.1.0** - Image editing capabilities, negative prompts, style presets, WebP format
- **v2.0.0** - Video generation support, renamed to venice-media
- **v1.0.0** - Initial image generation plugin

## License

MIT © Andres Rovira

## Prerequisites

- **Venice.ai API key** — get one at https://venice.ai/settings/api
- **OpenClaw configured** with Venice provider auth

## Installation

### From ClawHub (recommended):

```bash
openclaw plugins install openclaw-venice-media
```

### From source:

```bash
git clone https://github.com/acwilan/openclaw-venice-ai.git
cd openclaw-venice-ai
npm install
npm run build
openclaw plugins install "$(pwd)"
```

## Authentication

This plugin uses the **bundled Venice provider** for authentication. You need to set up your Venice API key once:

```bash
openclaw models auth paste-token --provider venice
```

Enter your Venice.ai API key when prompted. This same key is used for both text and media generation.

## Configuration

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "venice-media": {
        "enabled": true,
        "config": {
          "defaultImageSteps": 30,
          "defaultImageCfgScale": 7.0,
          "defaultVideoDuration": 6,
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
        "primary": "venice-media/flux-2-max"
      },
      "videoGenerationModel": {
        "primary": "venice-media/ltx-2-fast-text-to-video"
      }
    }
  }
}
```

**Note:** Set your preferred models in `agents.defaults` — OpenClaw passes these to the plugin automatically.

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultImageSteps` | number | `30` | Image inference steps (1-50) |
| `defaultImageCfgScale` | number | `7.0` | Image guidance scale (1.0-20.0) |
| `defaultVideoDuration` | number | `6` | Video duration in seconds (valid: 6,8,10,12,14,15,16,18,20,30) |
| `hideWatermark` | boolean | `false` | Hide Venice.ai watermark |
| `safeMode` | boolean | `false` | Enable content filtering |
| `outputDir` | string | `~/Downloads/venice-ai-output` | Where to save generated media |

## Usage

### Image Generation

```
Generate an image of a sunset over mountains
```

**Note on image size:** For best results and Telegram compatibility:
- Use smaller sizes (512x512, 768x768) for reliable auto-delivery
- Larger images (1024x1024) may exceed 5MB limit and fail

### Video Generation

```
Generate a video of waves crashing on a beach
```

**Note on video size:** Venice.ai videos can be large. For Telegram (5MB limit):
- Use lower resolution (480P) with `resolution` parameter
- Shorter durations (6s minimum, works for most models)
- Example: `Generate a 480P video of ...`

## Available Models

### Image Models

Popular models include:
- `flux-2-max` - High quality
- `flux-2-pro` - Professional quality
- `venice-sd35` - Stable Diffusion 3.5
- `recraft-v4-pro` - Recraft v4 Pro
- ... and 25+ more

See Venice.ai docs for full list: https://venice.ai/docs

### Video Models

Popular models include:
- `ltx-2-fast-text-to-video` - Default, fast generation
- `ltx-2-full-text-to-video` - Higher quality
- `wan-2-7-text-to-video` - WAN 2.7
- `seedance-2-0-text-to-video` - Seedance 2.0
- `kling-2.6-pro-text-to-video` - Kling 2.6 Pro
- ... and 70+ more

See Venice.ai docs for full list: https://venice.ai/docs

## Important Notes

1. **API Key Required:** You must obtain a Venice.ai API key from https://venice.ai/settings/api and configure it via `openclaw models auth paste-token --provider venice`

2. **Model Availability:** Venice.ai regularly adds new models. The plugin includes popular models but may not list every available model. Check Venice.ai documentation for the complete list.

3. **File Size Limits:** 
   - Telegram has a 5MB limit for media
   - Use smaller sizes (512x512) for images
   - Use 480P resolution for videos

4. **Duration Validation:** Video durations must be valid values: 6s, 8s, 10s, 12s, 14s, 15s, 16s, 18s, 20s, or 30s. The plugin automatically rounds to the nearest valid duration.

## License

MIT © Andres Rovira
