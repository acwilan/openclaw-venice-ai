#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogs, fetchCatalog } from "./model-catalogs-lib.mjs";
import { writeCatalog } from "./model-catalogs-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

async function main() {
  await mkdir(projectRoot, { recursive: true });

  for (const catalog of catalogs) {
    const payload = await fetchCatalog(catalog.type);
    const data = Array.isArray(payload?.data) ? payload.data.length : 0;
    await writeCatalog(projectRoot, catalog.file, payload);
    console.log(`Wrote ${catalog.file} (${data} models)`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
