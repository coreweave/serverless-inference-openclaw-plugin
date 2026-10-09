// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

// CoreWeave Serverless Inference model catalog plus live model discovery.
// Endpoint is still the W&B inference host after the CoreWeave rebrand.
import { createHash } from "node:crypto";
import type { ModelDefinitionConfig } from "./model-types.js";
import { createSubsystemLogger } from "openclaw/plugin-sdk/runtime-env";
import {
  fetchWithSsrFGuard,
  ssrfPolicyFromHttpBaseUrlAllowedHostname,
} from "openclaw/plugin-sdk/ssrf-runtime";
import { normalizeOptionalString } from "openclaw/plugin-sdk/string-coerce-runtime";
import manifest from "./openclaw.plugin.json" with { type: "json" };

const log = createSubsystemLogger("coreweave-models");

const catalog = manifest.modelCatalog.providers.coreweave;

/** Base URL for CoreWeave Serverless Inference (OpenAI-compatible). */
export const COREWEAVE_BASE_URL = catalog.baseUrl;
export const COREWEAVE_REQUEST_HEADERS = catalog.headers;
const COREWEAVE_DEFAULT_MODEL_ID = "moonshotai/Kimi-K2.6";
/** Default CoreWeave model ref used for onboarding. */
export const COREWEAVE_DEFAULT_MODEL_REF = `coreweave/${COREWEAVE_DEFAULT_MODEL_ID}`;

const COREWEAVE_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};
const COREWEAVE_DISCOVERY_TIMEOUT_MS = 10_000;
const COREWEAVE_DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1000;

/** Bundled CoreWeave catalog rows, sourced from the manifest single source of truth. */
export const COREWEAVE_MODEL_CATALOG: ModelDefinitionConfig[] = catalog.models.map((model) => ({
  ...model,
  input: model.input.map((input): "text" | "image" => {
    if (input !== "text" && input !== "image")
      throw new Error(`Unsupported catalog input: ${input}`);
    return input;
  }),
  cost: { ...COREWEAVE_DEFAULT_COST, ...model.cost },
}));

type CoreweaveCatalogEntry = Omit<ModelDefinitionConfig, "cost"> & {
  cost?: ModelDefinitionConfig["cost"];
};

/** Adds CoreWeave provider compat metadata and default cost to one catalog row. */
export function buildCoreweaveModelDefinition(entry: CoreweaveCatalogEntry): ModelDefinitionConfig {
  return {
    ...entry,
    cost: entry.cost ?? COREWEAVE_DEFAULT_COST,
    compat: {
      supportsUsageInStreaming: false,
      ...entry.compat,
    },
  };
}

function staticCoreweaveModelDefinitions(): ModelDefinitionConfig[] {
  return COREWEAVE_MODEL_CATALOG.map(buildCoreweaveModelDefinition);
}

interface CoreweaveModelRow {
  id?: unknown;
}

/**
 * Cache key for live `/models` discovery. Scopes by endpoint, the optional
 * project (the openai-project scope applies to the listing request too), and the
 * actual credential — so distinct keys or projects never share a cached row set.
 * Keying on the raw credential is safe because the discovery cache hashes key parts.
 */
export function coreweaveModelRowsCacheKey(params: {
  apiKey?: string;
  project?: string;
}): readonly string[] {
  return [
    "coreweave",
    "model-rows",
    `${COREWEAVE_BASE_URL}/models`,
    params.apiKey ?? "",
    params.project ?? "",
  ];
}

const discoveryCache = new Map<string, { expires: number; rows: readonly unknown[] }>();

async function fetchCoreweaveModelRows(
  apiKey?: string,
  project?: string,
): Promise<readonly unknown[]> {
  const key = createHash("sha256")
    .update(JSON.stringify(coreweaveModelRowsCacheKey({ apiKey, project })))
    .digest("hex");
  const cached = discoveryCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.rows;
  discoveryCache.delete(key);
  const { response, release } = await fetchWithSsrFGuard({
    url: `${COREWEAVE_BASE_URL}/models`,
    timeoutMs: COREWEAVE_DISCOVERY_TIMEOUT_MS,
    init: {
      headers: {
        Accept: "application/json",
        ...COREWEAVE_REQUEST_HEADERS,
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(project ? { "openai-project": project } : {}),
      },
    },
    policy: ssrfPolicyFromHttpBaseUrlAllowedHostname(COREWEAVE_BASE_URL),
    auditContext: "coreweave-model-discovery",
  });
  try {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body: unknown = await response.json();
    const rows =
      body && typeof body === "object" && "data" in body && Array.isArray(body.data)
        ? body.data
        : [];
    if (rows.length) {
      for (const [entry, value] of discoveryCache)
        if (value.expires <= Date.now()) discoveryCache.delete(entry);
      if (discoveryCache.size >= 100) discoveryCache.delete(discoveryCache.keys().next().value!);
      discoveryCache.set(key, {
        rows,
        expires: Date.now() + COREWEAVE_DISCOVERY_CACHE_TTL_MS,
      });
    }
    return rows;
  } finally {
    await release();
  }
}

/**
 * Discovers CoreWeave models from the live `/models` endpoint, mapping known ids
 * onto the verified manifest catalog without guessing metadata for unknown ids.
 * Falls back to the static catalog whenever discovery is unavailable.
 */
export async function discoverCoreweaveModels(
  apiKey?: string,
  project?: string,
): Promise<ModelDefinitionConfig[]> {
  try {
    const rows = await fetchCoreweaveModelRows(normalizeOptionalString(apiKey), project);
    if (rows.length === 0) {
      log.warn("No models in /models response, using static catalog");
      return staticCoreweaveModelDefinitions();
    }

    return mapCoreweaveModelRows(rows as CoreweaveModelRow[]);
  } catch (error) {
    log.warn(`Discovery failed: ${String(error)}, using static catalog`);
    return staticCoreweaveModelDefinitions();
  }
}

/** Keeps verified metadata authoritative when the discovery endpoint is stale. */
export function mapCoreweaveModelRows(rows: readonly CoreweaveModelRow[]): ModelDefinitionConfig[] {
  const catalogById = new Map(COREWEAVE_MODEL_CATALOG.map((model) => [model.id, model]));
  const seen = new Set<string>();
  const models: ModelDefinitionConfig[] = [];
  for (const row of rows) {
    const id = normalizeOptionalString(row?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const known = catalogById.get(id);
    if (!known) {
      log.warn(
        `Skipping model without verified metadata: ${id}; update the catalog or configure it explicitly`,
      );
      continue;
    }
    models.push(buildCoreweaveModelDefinition(known));
  }
  return models;
}
