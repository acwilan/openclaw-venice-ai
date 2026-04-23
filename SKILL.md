# SKILL.md - Venice.ai Media Generation

## Overview

This plugin provides image and video generation capabilities for OpenClaw using the Venice.ai API.

**Plugin ID:** `venice-media`
**Provider Type:** Image + Video Generation
**Auth Method:** OpenClaw bundled Venice provider

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
          "defaultImageModel": "flux-2-max",
          "defaultVideoModel": "ltx-2-fast-text-to-video",
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
        "primary": "venice-media/lustify-v8"
      },
      "videoGenerationModel": {
        "primary": "venice-media/ltx-2-fast-text-to-video"
      }
    }
  }
}
```

### Config Options Reference

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `defaultImageModel` | string | `lustify-v8` | - | Default image generation model |
| `defaultVideoModel` | string | `ltx-2-fast-text-to-video` | - | Default video generation model |
| `defaultImageSteps` | number | `30` | 1-50 | Inference steps for images |
| `defaultImageCfgScale` | number | `7.0` | 1.0-20.0 | Guidance scale for images |
| `defaultVideoDuration` | number | `6` | 6,8,10,12,14,15,16,18,20,30 | Video duration in seconds |
| `hideWatermark` | boolean | `false` | - | Hide Venice.ai watermark |
| `safeMode` | boolean | `false` | - | Enable content filtering |
| `outputDir` | string | `~/Downloads/venice-ai-output` | - | Output directory for media |

## Usage

### Image Generation

Basic usage:
```
Generate an image of a sunset over mountains
```

With specific model:
```
Generate an image with venice-media/flux-2-max of a cyberpunk city
```

With size:
```
Generate a 1024x1024 image of a cat
```

### Video Generation

Basic usage:
```
Generate a video of waves crashing on a beach
```

With specific model:
```
Generate a video with venice-media/wan-2-7-text-to-video of a rocket launch
```

With resolution (for Telegram compatibility):
```
Generate a 480P video of a waterfall
```

## Model Lists

### Image Models (included in plugin)

- `lustify-v8` - Default
- `flux-2-max`
- `flux-2-pro`
- `venice-sd35`
- `gpt-image-2`
- `recraft-v4-pro`
- And 25+ more

**Note:** Venice.ai regularly adds new models. Check https://venice.ai/docs for the complete list.

### Video Models (included in plugin)

- `ltx-2-fast-text-to-video` - Default
- `ltx-2-full-text-to-video`
- `wan-2-7-text-to-video`
- `seedance-2-0-text-to-video`
- `kling-2.6-pro-text-to-video`
- And 70+ more

**Note:** Venice.ai regularly adds new models. Check https://venice.ai/docs for the complete list.

## Technical Details

### Image Generation

- **Max images per request:** 4
- **Supported sizes:** 1024x1024, 1024x1536, 1536x1024, 832x1216, 1216x832, 512x512, 512x768, 768x512
- **Format:** PNG
- **API endpoint:** POST /image/generate

### Video Generation

- **Max videos per request:** 1
- **Supported aspect ratios:** 16:9, 9:16, 1:1, 4:3, 3:4
- **Supported durations:** 6s, 8s, 10s, 12s, 14s, 15s, 16s, 18s, 20s, 30s
- **Format:** MP4
- **API endpoints:**
  - POST /video/queue - Queue generation
  - POST /video/retrieve - Poll for status/download
  - POST /video/complete - Cleanup

## Limitations

1. **Telegram 5MB limit:** Large images and videos may exceed Telegram's file size limit. Use:
   - Smaller image sizes (512x512, 768x768)
   - Lower video resolutions (480P)
   - Shorter video durations

2. **Video duration rounding:** The plugin automatically rounds requested durations to valid values (6s, 8s, 10s, etc.)

3. **Celebrity/content filters:** Venice.ai may filter requests for real people, NSFW content, or copyrighted characters even with safe_mode disabled.

## Troubleshooting

### "No API key configured"

Run:
```bash
openclaw models auth setup-token --provider venice
```

### "Media exceeds 5MB limit"

Use smaller sizes:
- Images: 512x512 or 768x768
- Videos: 480P resolution

### Videos not delivering

Enable directSend in config:
```json
{
  "tools": {
    "media": {
      "asyncCompletion": {
        "directSend": true
      }
    }
  }
}
```

## Links

- **GitHub:** https://github.com/acwilan/openclaw-venice-ai
- **Venice.ai:** https://venice.ai
- **Venice Docs:** https://docs.venice.ai
