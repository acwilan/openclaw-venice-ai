# SKILL.md - Venice.ai Media Generation

## Overview

This plugin provides image and video generation capabilities for OpenClaw using the Venice.ai API.

**Plugin ID:** `venice-media`
**Provider Type:** Image + Video Generation
**Auth Method:** OpenClaw bundled Venice provider
**Version:** `2.2.0`

## Authentication

1. Obtain a Venice.ai API key from https://venice.ai/settings/api
2. Configure it in OpenClaw:
   ```bash
   openclaw models auth setup-token --provider venice
   ```

The plugin reuses the same Venice provider auth as Venice text models.

## Installation

From source:

```bash
git clone https://github.com/acwilan/openclaw-venice-ai.git
cd openclaw-venice-ai
npm install
npm run refresh-model-catalogs
npm run build
openclaw plugins install "$(pwd)"
```

For local development, linking is usually more convenient:

```bash
openclaw plugins install -l "$(pwd)"
```

## Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "venice-media": {
        "enabled": true,
        "config": {
          "defaultImageModel": "flux-2-max",
          "defaultVideoModel": "ltx-2-fast-text-to-video",
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

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultImageModel` | string | `flux-2-max` | Fallback image model |
| `defaultVideoModel` | string | `ltx-2-fast-text-to-video` | Fallback video model |
| `defaultImageSteps` | number | `30` | Image inference steps |
| `defaultImageCfgScale` | number | `7.0` | Image guidance scale |
| `defaultVideoDuration` | number | `6` | Default video duration in seconds |
| `defaultNegativePrompt` | string | — | Default negative prompt for images |
| `defaultStylePreset` | string | — | Default style preset for images |
| `defaultOutputFormat` | string | `webp` | `webp`, `png`, or `jpeg` |
| `defaultVideoNegativePrompt` | string | — | Default negative prompt for videos |
| `hideWatermark` | boolean | `false` | Hide Venice watermark |
| `safeMode` | boolean | `false` | Enable content filtering |
| `outputDir` | string | `~/Downloads/venice-ai-output` | Output directory |

## Model Catalogs

Local Venice model snapshots are checked in as:
- `image-models.json`
- `video-models.json`
- `inpaint-models.json`
- `upscale-models.json`

Useful commands:

```bash
npm run refresh-model-catalogs
npm run check-model-catalogs
npm run check-model-catalogs:drift
npm test
```

## Usage

### Image Generation

```text
Generate an image of a sunset over mountains
```

### Video Generation

```text
Generate a video of waves crashing on a beach
```

### Image-to-Video

Upload an image, then ask:

```text
Generate a video from this image of a cat playing
```

### Image Editing

The plugin parses prompts into three edit intents:

**Remove background**
```text
Remove background from this image
```
→ `POST /image/background-remove`

**Upscale**
```text
Upscale this image
```
→ `POST /image/upscale`

**General edit**
```text
Add sunglasses to the person in this image
```
→ `POST /image/edit` with an edit-capable sibling model when available (for example `gpt-image-2` → `gpt-image-2-edit`), otherwise fallback to `qwen-edit`

## Behavior Notes

- Image and video capabilities are derived from checked-in Venice model catalogs.
- Video requests auto-normalize duration, aspect ratio, and resolution to per-model supported values.
- Image edit requests resolve an edit-capable sibling model instead of hardcoding one edit model for every family.
- Image-to-video requests auto-switch to the corresponding image-to-video sibling model when needed.

## Links

- **GitHub:** https://github.com/acwilan/openclaw-venice-ai
- **Releases:** https://github.com/acwilan/openclaw-venice-ai/releases
- **Venice.ai:** https://venice.ai
- **Venice Docs:** https://docs.venice.ai
