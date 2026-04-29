import test from "node:test";
import assert from "node:assert/strict";

import { buildImageEditRequestBody, buildImageGenerationRequestBody } from "../dist/image-generation.js";
import { buildVideoQueueRequestBody } from "../dist/video-generation.js";

const imageConfig = {
  defaultImageSteps: 30,
  defaultImageCfgScale: 7,
  hideWatermark: false,
  safeMode: false,
};

const videoConfig = {
  defaultVideoDuration: 6,
};

test("image generation uses width/height for pixel-based models and normalizes divisor", () => {
  const body = buildImageGenerationRequestBody({
    prompt: "portrait",
    modelToUse: "qwen-image",
    size: "1025x1025",
    config: imageConfig,
    outputFormat: "webp",
    seed: 42,
  });

  assert.equal(body.model, "qwen-image");
  assert.equal(body.width, 1024);
  assert.equal(body.height, 1024);
  assert.equal(body.seed, 42);
  assert.equal(body.format, "webp");
  assert.ok(!("aspect_ratio" in body));
});

test("image generation uses aspect ratio and resolution for tiered models", () => {
  const body = buildImageGenerationRequestBody({
    prompt: "landscape",
    modelToUse: "gpt-image-2",
    aspectRatio: "16:9",
    resolution: "4K",
    config: imageConfig,
    outputFormat: "jpeg",
    seed: 7,
  });

  assert.equal(body.aspect_ratio, "16:9");
  assert.equal(body.resolution, "4K");
  assert.equal(body.format, "jpg");
  assert.ok(!("width" in body));
  assert.ok(!("height" in body));
});

test("image generation falls back to supported resolution for model", () => {
  const body = buildImageGenerationRequestBody({
    prompt: "portrait",
    modelToUse: "grok-imagine-image",
    aspectRatio: "21:9",
    resolution: "4K",
    config: imageConfig,
    outputFormat: "png",
    seed: 1,
  });

  assert.equal(body.aspect_ratio, "1:1");
  assert.equal(body.resolution, "1K");
});

test("image edit routing resolves sibling edit model and inferred aspect ratio", () => {
  const { model, body } = buildImageEditRequestBody({
    prompt: "replace the sky",
    requestedModel: "gpt-image-2",
    size: "1536x1024",
    imageBase64: "abc123",
  });

  assert.equal(model, "gpt-image-2-edit");
  assert.equal(body.model, "gpt-image-2-edit");
  assert.equal(body.aspect_ratio, "3:2");
  assert.equal(body.image, "abc123");
});

test("video queue payload switches to image-to-video sibling and normalizes options", () => {
  const { model, body, normalized } = buildVideoQueueRequestBody({
    prompt: "animate this scene",
    requestedModel: "ltx-2-fast-text-to-video",
    size: "1080x1920",
    durationSeconds: 7,
    inputImages: [{ url: "https://example.com/input.png" }],
    audio: true,
    watermark: false,
    config: videoConfig,
    negativePrompt: "blurry",
  });

  assert.equal(model, "ltx-2-fast-image-to-video");
  assert.equal(body.model, "ltx-2-fast-image-to-video");
  assert.equal(body.image_url, "https://example.com/input.png");
  assert.equal(body.aspect_ratio, "16:9");
  assert.equal(body.resolution, "1080p");
  assert.equal(body.duration, "6s");
  assert.equal(body.negative_prompt, "blurry");
  assert.equal(body.watermark, false);
  assert.equal(body.audio, true);
  assert.equal(normalized.normalizedModel, "ltx-2-fast-image-to-video");
  assert.equal(normalized.normalizedDuration, 6);
});

test("video queue payload keeps supported audio and smaller duration fallback", () => {
  const { body } = buildVideoQueueRequestBody({
    prompt: "ocean waves",
    requestedModel: "seedance-2-0-text-to-video",
    durationSeconds: 11,
    aspectRatio: "9:16",
    resolution: "1080p",
    audio: true,
    config: videoConfig,
  });

  assert.equal(body.model, "seedance-2-0-text-to-video");
  assert.equal(body.duration, "10s");
  assert.equal(body.aspect_ratio, "9:16");
  assert.equal(body.resolution, "1080p");
  assert.equal(body.audio, true);
});
