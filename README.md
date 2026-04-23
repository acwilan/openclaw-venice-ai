# OpenClaw Venice.ai Media Plugin

Image and video generation for OpenClaw using [Venice.ai](https://venice.ai) API.

## Features

- 🎨 **80+ image models** — flux-2-max, venice-sd35, gpt-image-2, recraft-v4-pro, and more
- 🎬 **80+ video models** — LTX, WAN, Kling, Veo, Sora, Runway Gen-4, and more
- 🔐 **Uses bundled Venice auth** — no separate API key needed
- 📐 **Multiple sizes** — various aspect ratios for images and video
- ⏱️ **Video duration & FPS control**

## Prerequisites

- **Venice.ai API key** — get one at https://venice.ai/settings/api
- The plugin uses the **bundled Venice provider** for authentication

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

This plugin uses the **bundled Venice provider** for authentication:

```bash
openclaw models auth setup-token --provider venice
```

## Configuration

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "venice-media": {
        "enabled": true,
        "config": {
          "defaultImageModel": "flux-2-max",
          "defaultVideoModel": "ltx-2-fast-text-to-video",
          "defaultImageSteps": 40,
          "defaultImageCfgScale": 8.0,
          "defaultVideoDuration": 5,
          "defaultVideoFps": 24,
          "hideWatermark": true,
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

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultImageModel` | string | `flux-2-max` | Default image model |
| `defaultVideoModel` | string | `ltx-2-fast-text-to-video` | Default video model |
| `defaultImageSteps` | number | `30` | Image inference steps |
| `defaultImageCfgScale` | number | `7.0` | Image guidance scale |
| `defaultVideoDuration` | number | `5` | Video duration (seconds) |
| `defaultVideoFps` | number | `24` | Video frame rate |
| `hideWatermark` | boolean | `false` | Hide Venice.ai watermark |
| `safeMode` | boolean | `false` | Enable content filtering |

## Usage

### Image Generation

```
Generate an image of a sunset over mountains
```

### Video Generation

```
Generate a video of waves crashing on a beach
```

Or specify models:

```
Generate an image with venice-media/recraft-v4-pro of a cyberpunk city
Generate a video with venice-media/kling-2.6-pro-text-to-video of a rocket launch
```

## Available Models

### Image Models (30+)

| Model | Description |
|-------|-------------|
| `flux-2-max` | FLUX 2 Max (high quality) |
| `flux-2-pro` | FLUX 2 Pro |
| `venice-sd35` | Stable Diffusion 3.5 |
| `gpt-image-2` | GPT Image 2 |
| `recraft-v4-pro` | Recraft v4 Pro |
| `lustify-v8` | Lustify v8 |
| ... and 25+ more |

### Video Models (80+)

| Model | Description |
|-------|-------------|
| `ltx-2-fast-text-to-video` | LTX 2 Fast |
| `ltx-2-full-text-to-video` | LTX 2 Full |
| `wan-2-7-text-to-video` | WAN 2.7 |
| `seedance-2-0-text-to-video` | Seedance 2.0 |
| `kling-2.6-pro-text-to-video` | Kling 2.6 Pro |
| `veo3-fast-text-to-video` | Veo 3 Fast |
| `sora-2-text-to-video` | Sora 2 |
| `runway-gen4-turbo` | Runway Gen-4 Turbo |
| ... and 70+ more |

See Venice.ai docs for full list: https://venice.ai/docs

## License

MIT © Andres Rovira
