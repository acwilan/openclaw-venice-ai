import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_UPSCALE_MODEL,
  chooseSupportedAspectRatio,
  chooseSupportedDuration,
  chooseSupportedImageResolution,
  getImageEditAspectRatios,
  inferAspectRatioFromSize,
  inferRawVideoResolutionFromSize,
  normalizeImageSize,
  resolveImageEditModel,
  resolveVideoModelForMode,
} from "../dist/model-metadata.js";

test("resolveImageEditModel maps generation models to edit siblings", () => {
  assert.equal(resolveImageEditModel("gpt-image-2"), "gpt-image-2-edit");
  assert.equal(resolveImageEditModel("nano-banana-pro"), "nano-banana-pro-edit");
  assert.equal(resolveImageEditModel("qwen-image-2-pro-edit"), "qwen-image-2-pro-edit");
});

test("resolveImageEditModel falls back to qwen-edit when no family match exists", () => {
  assert.equal(resolveImageEditModel("venice-sd35"), "qwen-edit");
});

test("getImageEditAspectRatios returns catalog-backed aspect ratios", () => {
  assert.deepEqual(getImageEditAspectRatios("gpt-image-2-edit"), ["1:1", "2:3", "3:2", "3:4", "4:5", "9:16", "16:9", "21:9"]);
  assert.ok(getImageEditAspectRatios("qwen-edit").includes("auto"));
});

test("resolveVideoModelForMode switches sibling models by requested mode", () => {
  assert.equal(resolveVideoModelForMode("ltx-2-fast-text-to-video", "image-to-video"), "ltx-2-fast-image-to-video");
  assert.equal(resolveVideoModelForMode("wan-2-7-image-to-video", "text-to-video"), "wan-2-7-text-to-video");
});

test("chooseSupportedDuration prefers nearest smaller supported duration", () => {
  assert.equal(chooseSupportedDuration(13, [5, 10, 15]), 10);
  assert.equal(chooseSupportedDuration(4, [5, 10, 15]), 5);
  assert.equal(chooseSupportedDuration(undefined, [5, 10, 15]), 5);
});

test("chooseSupportedAspectRatio prefers explicit, then fallback, then safe default", () => {
  assert.equal(chooseSupportedAspectRatio("16:9", ["1:1", "16:9"], "1:1"), "16:9");
  assert.equal(chooseSupportedAspectRatio("21:9", ["1:1", "16:9"], "16:9"), "16:9");
  assert.equal(chooseSupportedAspectRatio(undefined, ["9:16", "1:1"], undefined), "1:1");
});

test("chooseSupportedImageResolution uses supported fallback order", () => {
  assert.equal(chooseSupportedImageResolution("4K", ["1K", "2K", "4K"], "1K"), "4K");
  assert.equal(chooseSupportedImageResolution("4K", ["1K", "2K"], "2K"), "2K");
  assert.equal(chooseSupportedImageResolution(undefined, ["1K", "2K"], undefined), "1K");
});

test("size inference helpers normalize expected geometry", () => {
  assert.equal(inferAspectRatioFromSize("1536x1024"), "3:2");
  assert.equal(inferRawVideoResolutionFromSize("1920x1080"), "1080p");
  assert.deepEqual(normalizeImageSize("1025x1025", 8), { width: 1024, height: 1024 });
});

test("DEFAULT_UPSCALE_MODEL is discovered from Venice catalog", () => {
  assert.equal(DEFAULT_UPSCALE_MODEL, "upscaler");
});
