# OpenClaw Venice.ai Image Generation Plugin

Image generation for OpenClaw using [Venice.ai](https://venice.ai) API.

## Features

- 🎨 **30+ image generation models** via Venice.ai API
- 🔐 **Uses bundled Venice auth** — no separate API key needed if you already use Venice text models
- 📐 **Multiple sizes** — 1024x1024, 1024x1536, 1536x1024, 832x1216, 1216x832, 512x512, 512x768, 768x512
- 🎯 **Popular models** — flux-2-max, venice-sd35, gpt-image-2, recraft-v4-pro, and more

## Prerequisites

- **Venice.ai API key** — get one at https://venice.ai/settings/api
- The plugin uses the **bundled Venice provider** for authentication, so if you already have Venice text models configured, no additional setup is needed

## Installation

### From ClawHub (recommended):

```bash
openclaw plugins install openclaw-venice-ai
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

This plugin uses the **bundled Venice provider** for authentication. If you already have Venice text models set up, you're good to go!

If not, set up your Venice API key:

```bash
openclaw models auth setup-token --provider venice
```

Enter your Venice.ai API key when prompted.

## Configuration

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "venice-image": {
        "enabled": true,
        "config": {
          "defaultModel": "flux-2-max",
          "defaultSteps": 40,
          "defaultCfgScale": 8.0,
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
        "primary": "venice-image/flux-2-max"
      }
    }
  }
}
```

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultModel` | string | `venice-sd35` | Default model to use |
| `defaultSteps` | number | `30` | Inference steps (higher = better quality) |
| `defaultCfgScale` | number | `7.0` | Guidance scale (higher = more prompt adherence) |
| `hideWatermark` | boolean | `false` | Hide Venice.ai watermark |
| `safeMode` | boolean | `false` | Enable content filtering |
| `outputDir` | string | `~/Downloads/venice-ai-output` | Where to save images |

## Usage

Once installed and configured, OpenClaw can generate images:

```
Generate an image of a sunset over mountains
```

Or specify a different model:

```
Generate an image with venice-image/recraft-v4-pro of a cyberpunk city
```

## Available Models

| Model | Description |
|-------|-------------|
| `flux-2-max` | FLUX 2 Max (high quality) |
| `flux-2-pro` | FLUX 2 Pro |
| `venice-sd35` | Stable Diffusion 3.5 |
| `gpt-image-2` | GPT Image 2 |
| `recraft-v4-pro` | Recraft v4 Pro |
| `lustify-v8` | Lustify v8 |
| ... and 25+ more |

See Venice.ai docs for full list: https://venice.ai/docs

## License

MIT © Andres Rovira
