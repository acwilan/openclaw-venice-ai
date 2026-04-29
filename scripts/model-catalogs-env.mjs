export function getCatalogBaseUrl() {
  return process.env.VENICE_API_BASE_URL ?? "https://api.venice.ai/api/v1";
}

export function getCatalogAuthHeader() {
  const apiKey = process.env.VENICE_API_KEY;
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}
