# OpenClaw Venice.ai Image Generation Plugin

Image generation for OpenClaw using [Venice.ai](https://venice.ai) API.

## Features

- 🎨 **Image generation** via Venice.ai API
- 🔐 **API key authentication** — store in config or auth store
- 📐 **Multiple sizes** — 1024x1024, 1024x1536, 1536x1024, 832x1216, 1216x832, 512x512, 512x768, 768x512
- 🎯 **Multiple models** — venice-sd35, venice-sdxl, venice-pony

## Prerequisites

- **Venice.ai API key** — get one at https://venice.ai/settings/api

## Installation

### From source:

```bash
git clone https://github.com/acwilan/openclaw-venice-ai.git
cd openclaw-venice-ai
npm install
npm run build
openclaw plugins install "$(pwd)"
```

## Configuration

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "openclaw-venice-ai-image": {
        "enabled": true,
        "config": {
          "apiKey": "your-venice-api-key",
          "defaultModel": "venice-sd35",
          "outputDir": "~/Downloads/venice-ai-output"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "imageGenerationModel": {
        "primary": "venice-ai-image/venice-sd35"
      }
    }
  }
}
```

Or use the auth store (more secure):

```bash
openclaw models auth setup-token --provider openclaw-venice-ai-image
```

## Usage

Once installed and configured, OpenClaw can generate images:

```
Generate an image of a sunset over mountains
```

## Models

| Model | Description |
|-------|-------------|
| `venice-sd35` | Stable Diffusion 3.5 (default) |
| `venice-sdxl` | Stable Diffusion XL |
| `venice-pony` | Pony Diffusion |

## License

MIT © Andres Rovira
