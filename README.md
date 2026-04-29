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

### From ClawHub (recommended)

```bash
openclaw plugins install openclaw-venice-media
```

### From source

```bash
git clone https://github.com/acwilan/openclaw-venice-ai.git
cd openclaw-venice-ai
npm install
npm run refresh-model-catalogs
npm run build
openclaw plugins install "$(pwd)"
```

For local development, linking is usually nicer:

```bash
openclaw plugins install -l "$(pwd)"
```

## Authentication

This plugin uses the **bundled Venice provider** for authentication. You need to set up your Venice API key once:

```bash
openclaw models auth paste-token --provider venice
```

Enter your Venice.ai API key when prompted. This same key is used for both text and media generation.

## Model Catalog Refresh

The plugin keeps local Venice model snapshots in:
- `image-models.json`
- `video-models.json`
- `inpaint-models.json`
- `upscale-models.json`

Refresh them anytime with:

```bash
npm run refresh-model-catalogs
```

Run the unit tests:

```bash
npm test
```

Validate the checked-in catalogs locally:

```bash
npm run check-model-catalogs
```

Check for remote drift against the live Venice `/models` endpoint:

```bash
npm run check-model-catalogs:drift
```

CI runs both the local shape check and the live drift check on pull requests and pushes to `main`.

This uses the public Venice `/models` endpoint. If Venice ever starts requiring auth for model listing, set `VENICE_API_KEY` before running the scripts.

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
          "defaultVideoNegativePrompt": "blurry, shaky, low quality",
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

**Note:** The `primary` models in `agents.defaults` are what OpenClaw normally passes to the plugin. The plugin's internal defaults (`flux-2-max` for images, `ltx-2-fast-text-to-video` for video) are fallbacks.

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultImageModel` | string | `flux-2-max` | Fallback image model |
| `defaultVideoModel` | string | `ltx-2-fast-text-to-video` | Fallback video model |
| `defaultImageSteps` | number | `30` | Image inference steps (1-50) |
| `defaultImageCfgScale` | number | `7.0` | Image guidance scale (1.0-20.0) |
| `defaultVideoDuration` | number | `6` | Default video duration in seconds |
| `defaultNegativePrompt` | string | — | Default negative prompt for images |
| `defaultStylePreset` | string | — | Default image style preset |
| `defaultOutputFormat` | string | `webp` | Output format: `webp`, `png`, `jpeg` |
| `defaultVideoNegativePrompt` | string | — | Default negative prompt for videos |
| `hideWatermark` | boolean | `false` | Hide Venice.ai watermark |
| `safeMode` | boolean | `false` | Enable content filtering |
| `outputDir` | string | `~/Downloads/venice-ai-output` | Output directory setting |

## Usage

### Image Generation

```text
Generate an image of a sunset over mountains
```

With specific options:

```text
Generate a 512x512 image of a cat in 3D Model style
```

### Video Generation

```text
Generate a video of waves crashing on a beach
```

With resolution:

```text
Generate a 480P video of a waterfall
```

### Image-to-Video

Upload an image, then ask:

```text
Generate a video from this image of a cat playing
```

### Image Editing

The plugin parses your prompt to determine the editing operation:

**Remove background**

```text
Remove background from this image
```

**Upscale**

```text
Upscale this image
```

**General edit**

```text
Add sunglasses to the person in this image
```

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
- `ltx-2-fast-text-to-video` - Fast generation
- `ltx-2-full-text-to-video` - Higher quality
- `wan-2-7-text-to-video` - WAN 2.7
- `seedance-2-0-text-to-video` - Seedance 2.0
- `kling-2.6-pro-text-to-video` - Kling 2.6 Pro
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

| Model family | Durations |
|--------------|-----------|
| WAN 2.5 | 5s, 10s |
| WAN 2.6 / 2.7 | 5s, 10s, 15s |
| LTX and most others | 6s, 8s, 10s, 12s, 14s, 15s, 16s, 18s, 20s, 30s |

## Important Notes

1. **API Key Required:** You must obtain a Venice.ai API key from https://venice.ai/settings/api and configure it via `openclaw models auth paste-token --provider venice`.
2. **Model Availability:** Venice.ai regularly adds new models. The plugin includes popular models but may not list every available model.
3. **File Size Limits:** Telegram media limits can be tight. Smaller images, shorter videos, and lighter models are safer.
4. **Duration Validation:** The plugin rounds requested video durations to the nearest valid duration for the selected model.
5. **Image Editing:** The plugin code supports image editing, but full uploaded-image plumbing still depends on OpenClaw core behavior.

## Version History

- **v2.2.0** - Refactor into modular image/video providers
- **v2.1.0** - Image editing, negative prompts, style presets, WebP output
- **v2.0.0** - Video generation support, renamed to `venice-media`
- **v1.0.0** - Initial image generation plugin

## License

MIT © Andres Rovira
