import { getCatalogAuthHeader, getCatalogBaseUrl } from "./model-catalogs-env.mjs";

export const catalogs = [
  { type: "image", file: "image-models.json" },
  { type: "video", file: "video-models.json" },
  { type: "inpaint", file: "inpaint-models.json" },
  { type: "upscale", file: "upscale-models.json" },
];

export function buildModelsUrl(type, baseUrl = getCatalogBaseUrl()) {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL("models", normalizedBaseUrl);
  url.searchParams.set("type", type);
  return url;
}

export async function fetchCatalog(type, options = {}) {
  const response = await fetch(buildModelsUrl(type, options.baseUrl), {
    headers: {
      Accept: "application/json",
      ...getCatalogAuthHeader(),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch ${type} models (${response.status}): ${text}`);
  }

  return response.json();
}

export function validateCatalogShape(payload, expectedType) {
  const issues = [];

  if (!payload || typeof payload !== "object") {
    issues.push("payload is not an object");
    return issues;
  }

  if (payload.object !== "list") {
    issues.push(`object must be \"list\" (got ${JSON.stringify(payload.object)})`);
  }

  if (payload.type !== expectedType) {
    issues.push(`type must be ${JSON.stringify(expectedType)} (got ${JSON.stringify(payload.type)})`);
  }

  if (!Array.isArray(payload.data)) {
    issues.push("data must be an array");
    return issues;
  }

  const ids = new Set();
  for (const [index, model] of payload.data.entries()) {
    if (!model || typeof model !== "object") {
      issues.push(`data[${index}] must be an object`);
      continue;
    }
    if (typeof model.id !== "string" || model.id.length === 0) {
      issues.push(`data[${index}].id must be a non-empty string`);
    } else if (ids.has(model.id)) {
      issues.push(`duplicate model id: ${model.id}`);
    } else {
      ids.add(model.id);
    }
    if (typeof model.type !== "string" || model.type.length === 0) {
      issues.push(`data[${index}].type must be a non-empty string`);
    }
    if (!model.model_spec || typeof model.model_spec !== "object") {
      issues.push(`data[${index}].model_spec must be an object`);
    }
  }

  return issues;
}

export function stableStringify(value) {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, sortDeep(value[key])])
    );
  }
  return value;
}
