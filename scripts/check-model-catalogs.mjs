#!/usr/bin/env node

import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogs, fetchCatalog, stableStringify, validateCatalogShape } from "./model-catalogs-lib.mjs";
import { getCatalogPath, readCatalog } from "./model-catalogs-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const checkDrift = args.has("--check-drift");

async function main() {
  let failed = false;

  for (const catalog of catalogs) {
    const path = getCatalogPath(projectRoot, catalog.file);

    try {
      await access(path);
    } catch {
      console.error(`Missing catalog file: ${catalog.file}`);
      failed = true;
      continue;
    }

    let local;
    try {
      local = await readCatalog(projectRoot, catalog.file);
    } catch (error) {
      console.error(`Failed to read ${catalog.file}: ${error instanceof Error ? error.message : String(error)}`);
      failed = true;
      continue;
    }

    const issues = validateCatalogShape(local, catalog.type);
    if (issues.length > 0) {
      console.error(`Invalid catalog ${catalog.file}:`);
      for (const issue of issues) {
        console.error(`  - ${issue}`);
      }
      failed = true;
      continue;
    }

    console.log(`OK ${catalog.file} (${local.data.length} models)`);

    if (checkDrift) {
      const remote = await fetchCatalog(catalog.type);
      const remoteIssues = validateCatalogShape(remote, catalog.type);
      if (remoteIssues.length > 0) {
        console.error(`Remote catalog for ${catalog.type} is invalid:`);
        for (const issue of remoteIssues) {
          console.error(`  - ${issue}`);
        }
        failed = true;
        continue;
      }

      if (stableStringify(local) !== stableStringify(remote)) {
        console.error(`Drift detected in ${catalog.file}. Run: npm run refresh-model-catalogs`);
        failed = true;
      } else {
        console.log(`No drift ${catalog.file}`);
      }
    }
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
