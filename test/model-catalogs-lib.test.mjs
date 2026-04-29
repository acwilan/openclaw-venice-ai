import test from "node:test";
import assert from "node:assert/strict";

import {
  buildModelsUrl,
  catalogs,
  stableStringify,
  validateCatalogShape,
} from "../scripts/model-catalogs-lib.mjs";

test("catalog registry includes the expected Venice model snapshots", () => {
  assert.deepEqual(
    catalogs.map((entry) => entry.type),
    ["image", "video", "inpaint", "upscale"]
  );
});

test("buildModelsUrl targets the Venice models endpoint with type query", () => {
  const url = buildModelsUrl("inpaint");
  assert.equal(url.origin, "https://api.venice.ai");
  assert.equal(url.pathname, "/api/v1/models");
  assert.equal(url.searchParams.get("type"), "inpaint");
});

test("validateCatalogShape accepts a minimal valid payload", () => {
  const issues = validateCatalogShape(
    {
      object: "list",
      type: "image",
      data: [
        {
          id: "flux-2-max",
          type: "image",
          model_spec: { constraints: {} },
        },
      ],
    },
    "image"
  );

  assert.deepEqual(issues, []);
});

test("validateCatalogShape reports malformed payload details", () => {
  const issues = validateCatalogShape(
    {
      object: "wrong",
      type: "video",
      data: [
        { id: "", type: "video", model_spec: null },
        { id: "dup", type: "", model_spec: {} },
        { id: "dup", type: "video", model_spec: {} },
      ],
    },
    "image"
  );

  assert.ok(issues.some((issue) => issue.includes('object must be "list"')));
  assert.ok(issues.some((issue) => issue.includes('type must be "image"')));
  assert.ok(issues.some((issue) => issue.includes("data[0].id must be a non-empty string")));
  assert.ok(issues.some((issue) => issue.includes("data[0].model_spec must be an object")));
  assert.ok(issues.some((issue) => issue.includes("data[1].type must be a non-empty string")));
  assert.ok(issues.some((issue) => issue.includes("duplicate model id: dup")));
});

test("stableStringify normalizes object key order for deterministic comparisons", () => {
  const left = {
    b: 2,
    a: {
      d: 4,
      c: 3,
    },
  };
  const right = {
    a: {
      c: 3,
      d: 4,
    },
    b: 2,
  };

  assert.equal(stableStringify(left), stableStringify(right));
});
