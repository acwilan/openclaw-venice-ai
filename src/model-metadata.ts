import { readFileSync } from "node:fs";

const IMAGE_MODEL_JSON_URL = new URL("../image-models.json", import.meta.url);
const VIDEO_MODEL_JSON_URL = new URL("../video-models.json", import.meta.url);
const INPAINT_MODEL_JSON_URL = new URL("../inpaint-models.json", import.meta.url);
const UPSCALE_MODEL_JSON_URL = new URL("../upscale-models.json", import.meta.url);

export type VeniceImageResolution = "1K" | "2K" | "4K";
export type VeniceVideoMode = "text-to-video" | "image-to-video" | "video";

export interface VeniceImageEditModel {
  id: string;
  baseModelId?: string;
  aspectRatios?: string[];
  model_spec?: {
    name?: string;
    constraints?: VeniceImageModelConstraints;
  };
}

export interface VeniceImageModelConstraints {
  promptCharacterLimit?: number;
  aspectRatios?: string[];
  aspect_ratios?: string[];
  defaultAspectRatio?: string;
  defaultResolution?: VeniceImageResolution | string;
  resolutions?: string[];
  steps?: { default?: number; max?: number };
  widthHeightDivisor?: number;
}

export interface VeniceVideoModelConstraints {
  model_type?: VeniceVideoMode | string;
  aspectRatios?: string[];
  aspect_ratios?: string[];
  resolutions?: string[];
  durations?: string[];
  audio?: boolean;
  audio_configurable?: boolean;
  audio_input?: boolean;
  video_input?: boolean;
  prompt_character_limit?: number;
}

interface VeniceModelRecord<TConstraints> {
  id: string;
  type: string;
  model_spec?: {
    name?: string;
    constraints?: TConstraints;
  };
}

interface VeniceModelList<TConstraints> {
  data?: VeniceModelRecord<TConstraints>[];
}

const IMAGE_MODELS = loadModelList<VeniceImageModelConstraints>(IMAGE_MODEL_JSON_URL);
const VIDEO_MODELS = loadModelList<VeniceVideoModelConstraints>(VIDEO_MODEL_JSON_URL);
const INPAINT_MODELS = loadModelList<VeniceImageModelConstraints>(INPAINT_MODEL_JSON_URL);
const UPSCALE_MODELS = loadModelList<VeniceImageModelConstraints>(UPSCALE_MODEL_JSON_URL);

const IMAGE_MODEL_MAP = new Map(IMAGE_MODELS.map((model) => [model.id, model]));
const VIDEO_MODEL_MAP = new Map(VIDEO_MODELS.map((model) => [model.id, model]));
const INPAINT_MODEL_MAP = new Map(INPAINT_MODELS.map((model) => [model.id, model]));
const UPSCALE_MODEL_MAP = new Map(UPSCALE_MODELS.map((model) => [model.id, model]));

const IMAGE_EDIT_MODELS = INPAINT_MODELS.map((model) => ({
  id: model.id,
  baseModelId: inferBaseModelIdForEdit(model.id),
  aspectRatios: getAspectRatios(model.model_spec?.constraints),
  model_spec: model.model_spec,
}));

const IMAGE_EDIT_MODEL_MAP = new Map(IMAGE_EDIT_MODELS.map((model) => [model.id, model]));

export const VENICE_IMAGE_EDIT_MODELS = IMAGE_EDIT_MODELS.map((model) => model.id);
export const VENICE_UPSCALE_MODELS = UPSCALE_MODELS.map((model) => model.id);
export const DEFAULT_UPSCALE_MODEL = VENICE_UPSCALE_MODELS[0] ?? "upscaler";
export const VENICE_IMAGE_MODELS = uniqueSorted([...IMAGE_MODELS.map((model) => model.id), ...VENICE_IMAGE_EDIT_MODELS]);
export const VENICE_VIDEO_MODELS = VIDEO_MODELS.map((model) => model.id);

export const VENICE_IMAGE_ASPECT_RATIOS = uniqueSorted(
  IMAGE_MODELS.flatMap((model) => getAspectRatios(model.model_spec?.constraints))
);

export const VENICE_IMAGE_RESOLUTIONS = uniqueSorted(
  IMAGE_MODELS.flatMap((model) => getImageResolutions(model.model_spec?.constraints))
) as VeniceImageResolution[];

export const VENICE_VIDEO_ASPECT_RATIOS = uniqueSorted(
  VIDEO_MODELS.flatMap((model) => getAspectRatios(model.model_spec?.constraints))
);

export const VENICE_VIDEO_RESOLUTIONS = uniqueSorted(
  VIDEO_MODELS.flatMap((model) => getOpenClawVideoResolutions(model.model_spec?.constraints))
) as Array<"480P" | "720P" | "768P" | "1080P">;

export const VENICE_VIDEO_DURATIONS = uniqueNumberSorted(
  VIDEO_MODELS.flatMap((model) => getVideoDurations(model.model_spec?.constraints))
);

export const VENICE_VIDEO_DURATIONS_BY_MODEL: Readonly<Record<string, readonly number[]>> = Object.freeze(
  Object.fromEntries(
    VIDEO_MODELS.map((model) => [model.id, getVideoDurations(model.model_spec?.constraints)])
      .filter(([, durations]) => durations.length > 0)
  )
);

export function getImageModelMetadata(modelId: string): VeniceModelRecord<VeniceImageModelConstraints> | undefined {
  return IMAGE_MODEL_MAP.get(modelId);
}

export function getVideoModelMetadata(modelId: string): VeniceModelRecord<VeniceVideoModelConstraints> | undefined {
  return VIDEO_MODEL_MAP.get(modelId);
}

export function getImageEditModelMetadata(modelId: string): VeniceImageEditModel | undefined {
  return IMAGE_EDIT_MODEL_MAP.get(modelId);
}

export function getUpscaleModelMetadata(modelId: string): VeniceModelRecord<VeniceImageModelConstraints> | undefined {
  return UPSCALE_MODEL_MAP.get(modelId);
}

export function isImageEditModel(modelId: string): boolean {
  return IMAGE_EDIT_MODEL_MAP.has(modelId);
}

export function resolveImageEditModel(modelId: string): string {
  if (isImageEditModel(modelId)) {
    return modelId;
  }

  const directMatch = IMAGE_EDIT_MODELS.find((candidate) => candidate.baseModelId === modelId);
  if (directMatch) {
    return directMatch.id;
  }

  const family = getImageFamilyKey(modelId);
  const familyMatch = IMAGE_EDIT_MODELS.find((candidate) => {
    const baseFamily = candidate.baseModelId ? getImageFamilyKey(candidate.baseModelId) : undefined;
    return baseFamily === family;
  });
  if (familyMatch) {
    return familyMatch.id;
  }

  return "qwen-edit";
}

export function getImageResolutions(constraints?: VeniceImageModelConstraints): VeniceImageResolution[] {
  return uniqueSorted(
    (constraints?.resolutions ?? [])
      .map((value) => normalizeImageResolution(value))
      .filter((value): value is VeniceImageResolution => value !== undefined)
  ) as VeniceImageResolution[];
}

export function getOpenClawVideoResolutions(
  constraints?: VeniceVideoModelConstraints
): Array<"480P" | "720P" | "768P" | "1080P"> {
  return uniqueSorted(
    (constraints?.resolutions ?? [])
      .map((value) => normalizeOpenClawVideoResolution(value))
      .filter((value): value is "480P" | "720P" | "768P" | "1080P" => value !== undefined)
  ) as Array<"480P" | "720P" | "768P" | "1080P">;
}

export function getRawVideoResolutions(constraints?: VeniceVideoModelConstraints): string[] {
  return uniqueSorted((constraints?.resolutions ?? []).map((value) => value.toLowerCase()));
}

export function getVideoDurations(constraints?: VeniceVideoModelConstraints): number[] {
  return uniqueNumberSorted(
    (constraints?.durations ?? [])
      .map((value) => parseDurationSeconds(value))
      .filter((value): value is number => value !== undefined)
  );
}

export function getAspectRatios(
  constraints?: VeniceImageModelConstraints | VeniceVideoModelConstraints
): string[] {
  return uniqueSorted((constraints?.aspectRatios ?? constraints?.aspect_ratios ?? []).filter(Boolean));
}

export function getVideoMode(modelId: string): VeniceVideoMode | undefined {
  const mode = getVideoModelMetadata(modelId)?.model_spec?.constraints?.model_type;
  if (mode === "text-to-video" || mode === "image-to-video" || mode === "video") {
    return mode;
  }
  return undefined;
}

export function resolveVideoModelForMode(modelId: string, mode: VeniceVideoMode): string {
  if (getVideoMode(modelId) === mode) {
    return modelId;
  }

  const family = getVideoFamilyKey(modelId);
  const familyMatch = VIDEO_MODELS.find(
    (candidate) => getVideoFamilyKey(candidate.id) === family && getVideoMode(candidate.id) === mode
  );
  if (familyMatch) {
    return familyMatch.id;
  }

  const firstModeMatch = VIDEO_MODELS.find((candidate) => getVideoMode(candidate.id) === mode);
  return firstModeMatch?.id ?? modelId;
}

export function getDefaultAspectRatio(
  constraints?: VeniceImageModelConstraints | VeniceVideoModelConstraints
): string | undefined {
  const supported = getAspectRatios(constraints);
  const explicitDefault = "defaultAspectRatio" in (constraints ?? {})
    ? (constraints as VeniceImageModelConstraints).defaultAspectRatio
    : undefined;

  if (explicitDefault && supported.includes(explicitDefault)) {
    return explicitDefault;
  }

  return pickPreferredAspectRatio(supported);
}

export function getImageEditAspectRatios(modelId: string): string[] {
  const editModel = getImageEditModelMetadata(modelId);
  if (!editModel) {
    return [];
  }

  if (editModel.aspectRatios && editModel.aspectRatios.length > 0) {
    return editModel.aspectRatios;
  }

  if (editModel.baseModelId) {
    return getAspectRatios(getImageModelMetadata(editModel.baseModelId)?.model_spec?.constraints);
  }

  return [];
}

export function getDefaultImageResolution(constraints?: VeniceImageModelConstraints): VeniceImageResolution | undefined {
  const supported = getImageResolutions(constraints);
  const explicitDefault = normalizeImageResolution(constraints?.defaultResolution);
  if (explicitDefault && supported.includes(explicitDefault)) {
    return explicitDefault;
  }
  return supported[0];
}

export function getDefaultVideoResolution(constraints?: VeniceVideoModelConstraints): string | undefined {
  const supported = getRawVideoResolutions(constraints);
  return supported[0];
}

export function chooseSupportedDuration(requested: number | undefined, supported: readonly number[]): number | undefined {
  if (supported.length === 0) {
    return requested;
  }
  if (requested === undefined) {
    return supported[0];
  }

  const smallerOrEqual = [...supported].filter((value) => value <= requested);
  if (smallerOrEqual.length > 0) {
    return smallerOrEqual[smallerOrEqual.length - 1];
  }
  return supported[0];
}

export function chooseSupportedAspectRatio(
  requested: string | undefined,
  supported: readonly string[],
  fallback?: string
): string | undefined {
  if (supported.length === 0) {
    return requested ?? fallback;
  }
  if (requested && supported.includes(requested)) {
    return requested;
  }
  if (fallback && supported.includes(fallback)) {
    return fallback;
  }
  return pickPreferredAspectRatio(supported);
}

export function chooseSupportedImageResolution(
  requested: VeniceImageResolution | undefined,
  supported: readonly VeniceImageResolution[],
  fallback?: VeniceImageResolution
): VeniceImageResolution | undefined {
  if (supported.length === 0) {
    return requested ?? fallback;
  }
  if (requested && supported.includes(requested)) {
    return requested;
  }
  if (fallback && supported.includes(fallback)) {
    return fallback;
  }
  return supported[0];
}

export function chooseSupportedVideoResolution(
  requested: string | undefined,
  supported: readonly string[],
  fallback?: string
): string | undefined {
  if (supported.length === 0) {
    return requested ?? fallback;
  }

  const normalizedRequested = requested?.toLowerCase();
  if (normalizedRequested && supported.includes(normalizedRequested)) {
    return normalizedRequested;
  }
  if (fallback && supported.includes(fallback.toLowerCase())) {
    return fallback.toLowerCase();
  }
  return supported[0];
}

export function inferAspectRatioFromSize(size: string | undefined): string | undefined {
  if (!size) {
    return undefined;
  }

  const [width, height] = size.split("x").map(Number);
  if (!width || !height) {
    return undefined;
  }

  const gcd = greatestCommonDivisor(width, height);
  return `${width / gcd}:${height / gcd}`;
}

export function inferRawVideoResolutionFromSize(size: string | undefined): string | undefined {
  if (!size) {
    return undefined;
  }

  const [width, height] = size.split("x").map(Number);
  if (!width || !height) {
    return undefined;
  }

  const tierDimension = Math.min(width, height);

  if (tierDimension >= 2160) return "2160p";
  if (tierDimension >= 1440) return "1440p";
  if (tierDimension >= 1080) return "1080p";
  if (tierDimension >= 768) return "768p";
  if (tierDimension >= 720) return "720p";
  if (tierDimension >= 580) return "580p";
  if (tierDimension >= 540) return "540p";
  if (tierDimension >= 480) return "480p";
  return "360p";
}

export function normalizeImageSize(
  size: string | undefined,
  divisor = 1,
  fallback = { width: 1024, height: 1024 }
): { width: number; height: number } {
  const [rawWidth, rawHeight] = (size ?? "").split("x").map(Number);
  const width = rawWidth || fallback.width;
  const height = rawHeight || fallback.height;

  return {
    width: normalizeDimension(width, divisor),
    height: normalizeDimension(height, divisor),
  };
}

function loadModelList<TConstraints>(url: URL): VeniceModelRecord<TConstraints>[] {
  const parsed = JSON.parse(readFileSync(url, "utf8")) as VeniceModelList<TConstraints>;
  return parsed.data ?? [];
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort(compareLexicalLoosely);
}

function uniqueNumberSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function compareLexicalLoosely(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function normalizeImageResolution(value: string | undefined): VeniceImageResolution | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.toUpperCase();
  if (normalized === "1K" || normalized === "2K" || normalized === "4K") {
    return normalized;
  }
  return undefined;
}

function normalizeOpenClawVideoResolution(
  value: string | undefined
): "480P" | "720P" | "768P" | "1080P" | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.toUpperCase();
  if (normalized === "480P" || normalized === "720P" || normalized === "768P" || normalized === "1080P") {
    return normalized;
  }
  return undefined;
}

function parseDurationSeconds(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  if (value.toLowerCase() === "auto") {
    return undefined;
  }
  const match = value.match(/^(\d+)(?:s)?$/i);
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1], 10);
}

function pickPreferredAspectRatio(supported: readonly string[]): string | undefined {
  const preferredOrder = ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "21:9", "auto"];
  for (const candidate of preferredOrder) {
    if (supported.includes(candidate)) {
      return candidate;
    }
  }
  return supported[0];
}

function getVideoFamilyKey(modelId: string): string {
  return modelId
    .replace(/-(text-to-video|image-to-video|reference-to-video|video-to-video|reference-to-image)$/u, "")
    .replace(/-(private)$/u, "");
}

function getImageFamilyKey(modelId: string): string {
  return modelId
    .replace(/-edit$/u, "")
    .replace(/-text-to-image$/u, "")
    .replace(/-image$/u, "");
}

function inferBaseModelIdForEdit(editModelId: string): string | undefined {
  if (editModelId === "qwen-edit" || editModelId === "firered-image-edit") {
    return undefined;
  }

  const direct = editModelId.replace(/-edit$/u, "");
  if (IMAGE_MODEL_MAP.has(direct)) {
    return direct;
  }

  const family = getImageFamilyKey(editModelId);
  return IMAGE_MODELS.find((candidate) => getImageFamilyKey(candidate.id) === family)?.id;
}

function normalizeDimension(value: number, divisor: number): number {
  const effectiveDivisor = Math.max(1, divisor);
  return Math.max(effectiveDivisor, Math.floor(value / effectiveDivisor) * effectiveDivisor);
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x || 1;
}
