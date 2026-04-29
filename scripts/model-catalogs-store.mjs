import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export function getCatalogPath(projectRoot, file) {
  return resolve(projectRoot, file);
}

export async function readCatalog(projectRoot, file) {
  const text = await readFile(getCatalogPath(projectRoot, file), "utf8");
  return JSON.parse(text);
}

export async function writeCatalog(projectRoot, file, payload) {
  await writeFile(getCatalogPath(projectRoot, file), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
