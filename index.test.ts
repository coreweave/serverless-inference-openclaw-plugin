// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

// CoreWeave tests cover catalog auth gating and the optional project header.
import { registerSingleProviderPlugin } from "./test-helpers.js";
import type { ModelProviderConfig } from "./model-types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import plugin from "./index.js";
import packageMetadata from "./package.json" with { type: "json" };
import { fetchWithSsrFGuard } from "openclaw/plugin-sdk/ssrf-runtime";
import { applyCoreweaveConfig } from "./onboard.js";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import type { UnifiedModelCatalogProviderPlugin } from "openclaw/plugin-sdk/plugin-entry";

vi.mock("openclaw/plugin-sdk/ssrf-runtime", async (original) => ({
  ...(await original<typeof import("openclaw/plugin-sdk/ssrf-runtime")>()),
  fetchWithSsrFGuard: vi.fn(),
}));

const expectedUserAgent = `openclaw-coreweave/${packageMetadata.version}`;
const guardedFetch = vi.mocked(fetchWithSsrFGuard);
beforeEach(() => {
  vi.useRealTimers();
  guardedFetch.mockReset();
  guardedFetch.mockImplementation(async () => ({
    response: new Response(JSON.stringify({ data: [] })),
    finalUrl: `${COREWEAVE_BASE_URL}/models`,
    release: async () => {},
  }));
});
import {
  discoverCoreweaveModels,
  coreweaveModelRowsCacheKey,
  COREWEAVE_BASE_URL,
  COREWEAVE_DEFAULT_MODEL_REF,
  COREWEAVE_MODEL_CATALOG,
  mapCoreweaveModelRows,
} from "./models.js";

type CatalogCtx = {
  config: unknown;
  resolveProviderApiKey: () => { apiKey: string | undefined };
};

// ProviderCatalogResult is a union; narrow to the single-provider variant.
function readProvider(result: unknown) {
  return result && typeof result === "object" && "provider" in result
    ? (result as { provider: ModelProviderConfig }).provider
    : null;
}

async function runLiveCatalog(ctx: CatalogCtx): Promise<ModelProviderConfig | null> {
  const registered = await registerSingleProviderPlugin(plugin);
  return readProvider(await registered.catalog?.run(ctx as never));
}

describe("coreweave provider plugin", () => {
  it("does not reintroduce a retired or unknown model from live discovery", () => {
    const models = mapCoreweaveModelRows([
      { id: "Qwen/Qwen3-235B-A22B-Instruct-2507" },
      { id: "unverified/new-model" },
      { id: "MiniMaxAI/MiniMax-M3" },
      { id: "MiniMaxAI/MiniMax-M3" },
    ]);
    expect(models.map((model) => model.id)).toEqual(["MiniMaxAI/MiniMax-M3"]);
    expect(models[0]).toMatchObject({
      input: ["text", "image"],
      contextWindow: 262144,
      maxTokens: 262144,
      cost: { input: 0.23, output: 0.96, cacheRead: 0.05 },
    });
    expect(mapCoreweaveModelRows([{ id: "unverified/only-model" }])).toEqual([]);
  });

  it("discovers DeepSeek V4.1 Flash and Gemma 4 26B A4B with verified metadata", () => {
    const models = mapCoreweaveModelRows([
      { id: "deepseek-ai/DeepSeek-V4.1-Flash" },
      { id: "google/gemma-4-26B-A4B-it" },
      { id: "Qwen/Qwen3-235B-A22B-Instruct-2507" },
      { id: "deepseek-ai/DeepSeek-V4.1-Flash" },
    ]);
    expect(models).toHaveLength(2);
    expect(models[0]).toMatchObject({
      id: "deepseek-ai/DeepSeek-V4.1-Flash",
      name: "DeepSeek: DeepSeek V4.1 Flash",
      reasoning: true,
      input: ["text", "image"],
      contextWindow: 1048576,
      maxTokens: 1048576,
      cost: { input: 0.2, output: 0.65, cacheRead: 0.03 },
      compat: { supportsUsageInStreaming: false },
    });
    expect(models[1]).toMatchObject({
      id: "google/gemma-4-26B-A4B-it",
      name: "Google: Gemma 4 26B A4B",
      reasoning: true,
      input: ["text", "image"],
      contextWindow: 262144,
      maxTokens: 262144,
      cost: { input: 0.1, output: 0.3, cacheRead: 0.05 },
      compat: { supportsUsageInStreaming: false },
    });
  });

  it("returns null catalog when no API key is available", async () => {
    const provider = await runLiveCatalog({
      config: {},
      resolveProviderApiKey: () => ({ apiKey: undefined }),
    });
    expect(provider).toBeNull();
  });

  it("returns the static catalog with the resolved API key when a key is present", async () => {
    const provider = await runLiveCatalog({
      config: {},
      resolveProviderApiKey: () => ({ apiKey: "test-key" }),
    });
    expect(provider?.baseUrl).toBe(COREWEAVE_BASE_URL);
    expect(provider?.apiKey).toBe("test-key");
    expect(provider?.models?.length ?? 0).toBeGreaterThan(0);
    expect(provider?.headers).toEqual({ "User-Agent": expectedUserAgent });
  });

  it("attaches the openai-project header when the plugin project config is set", async () => {
    const provider = await runLiveCatalog({
      config: {
        plugins: {
          entries: { coreweave: { config: { project: "my-team/my-project" } } },
        },
      },
      resolveProviderApiKey: () => ({ apiKey: "test-key" }),
    });
    expect(provider?.headers).toEqual({
      "User-Agent": expectedUserAgent,
      "openai-project": "my-team/my-project",
    });
  });

  it("keeps the default model ref pointing at a real catalog row", () => {
    const defaultId = COREWEAVE_DEFAULT_MODEL_REF.replace(/^coreweave\//, "");
    expect(COREWEAVE_MODEL_CATALOG.some((m) => m.id === defaultId)).toBe(true);
  });

  it("excludes models past their published retirement date", () => {
    const retiredIds = [
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Pro",
      "ibm-granite/granite-4.1-8b",
      "JetBrains/Mellum2-12B-A2.5B-Instruct",
      "meta-llama/Llama-3.1-70B-Instruct",
      "OpenPipe/Qwen3-14B-Instruct",
      "Qwen/Qwen3.6-27B",
      "Qwen/Qwen3.5-35B-A3B",
      "Qwen/Qwen3-30B-A3B-Instruct-2507",
    ];
    const catalogIds = new Set(COREWEAVE_MODEL_CATALOG.map((model) => model.id));

    expect(retiredIds.filter((id) => catalogIds.has(id))).toEqual([]);
  });

  it("exposes a static catalog for credential-free discovery", async () => {
    const registered = await registerSingleProviderPlugin(plugin);
    const provider = readProvider(await registered.staticCatalog?.run({ config: {} } as never));
    expect(provider?.models?.length ?? 0).toBeGreaterThan(0);
    expect(provider?.headers).toEqual({ "User-Agent": expectedUserAgent });
  });

  it("scopes the discovery cache by credential and project", () => {
    const keyA = coreweaveModelRowsCacheKey({
      apiKey: "key-a",
      project: "team/p1",
    });
    // Different credential and different project must not reuse a cached row set.
    expect(coreweaveModelRowsCacheKey({ apiKey: "key-b", project: "team/p1" })).not.toEqual(keyA);
    expect(coreweaveModelRowsCacheKey({ apiKey: "key-a", project: "team/p2" })).not.toEqual(keyA);
    // Distinct credentials must not collapse onto a shared anon/auth marker.
    expect(coreweaveModelRowsCacheKey({})).not.toEqual(
      coreweaveModelRowsCacheKey({ apiKey: "key-a" }),
    );
    // Identical inputs are stable so the TTL cache still hits.
    expect(coreweaveModelRowsCacheKey({ apiKey: "key-a", project: "team/p1" })).toEqual(keyA);
  });
});

describe("public SDK migration", () => {
  it("preserves custom models, credentials, project headers, aliases and primary model during setup", () => {
    const custom = { ...COREWEAVE_MODEL_CATALOG[0]!, name: "Custom label" };
    const cfg: OpenClawConfig = {
      models: {
        mode: "replace",
        providers: {
          coreweave: {
            baseUrl: COREWEAVE_BASE_URL,
            apiKey: "saved-key",
            headers: { "openai-project": "team/project" },
            models: [custom],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "other/model", fallbacks: ["other/fallback"] },
          models: {
            [COREWEAVE_DEFAULT_MODEL_REF]: { alias: "My alias" },
            "other/model": { alias: "Other" },
          },
        },
      },
    };
    const before = structuredClone(cfg);
    const next = applyCoreweaveConfig(cfg);
    expect(cfg).toEqual(before);
    expect(next.agents).toEqual(cfg.agents);
    expect(next.models?.mode).toBe("replace");
    expect(next.models?.providers?.coreweave).toMatchObject({
      apiKey: "saved-key",
      headers: { "openai-project": "team/project", "User-Agent": expectedUserAgent },
    });
    expect(next.models?.providers?.coreweave?.models[0]).toEqual(custom);
    expect(next.models?.providers?.coreweave?.models).toHaveLength(COREWEAVE_MODEL_CATALOG.length);
    expect(applyCoreweaveConfig(next)).toEqual(next);
    expect(applyCoreweaveConfig({}).agents?.defaults?.model).toEqual({
      primary: COREWEAVE_DEFAULT_MODEL_REF,
    });
  });

  it("uses the public auth helper with the existing CLI choice and environment variable", async () => {
    const provider = await registerSingleProviderPlugin(plugin);
    const auth = provider.auth[0]!;
    expect(provider.envVars).toEqual(["COREWEAVE_API_KEY"]);
    expect(auth).toMatchObject({
      id: "api-key",
      kind: "api_key",
      wizard: { choiceId: "coreweave-api-key", groupId: "coreweave" },
    });
    const resolveApiKey = vi.fn().mockResolvedValue({ key: "test-key", source: "flag" });
    expect(
      await auth.validateNonInteractive!({
        opts: { coreweaveApiKey: "test-key" },
        resolveApiKey,
      } as never),
    ).toBe(true);
    expect(resolveApiKey).toHaveBeenCalledWith({
      provider: "coreweave",
      flagValue: "test-key",
      flagName: "--coreweave-api-key",
      envVar: "COREWEAVE_API_KEY",
    });
  });

  it("captures a supplied API key through the real public auth helper", async () => {
    const provider = await registerSingleProviderPlugin(plugin);
    const note = vi.fn().mockResolvedValue(undefined);
    const result = await provider.auth[0]!.run({
      config: {},
      opts: { coreweaveApiKey: "test-auth-key" },
      env: {},
      secretInputMode: "plaintext",
      allowSecretRefPrompt: false,
      prompter: { note },
    } as never);
    expect(result.profiles).toEqual([
      {
        profileId: "coreweave:default",
        credential: {
          type: "api_key",
          provider: "coreweave",
          key: "test-auth-key",
        },
      },
    ]);
    expect(result.defaultModel).toBe(COREWEAVE_DEFAULT_MODEL_REF);
    expect(result.configPatch?.models?.providers?.coreweave?.models).toHaveLength(
      COREWEAVE_MODEL_CATALOG.length,
    );
  });

  it("registers static and authenticated unified catalogs without changing model labels", async () => {
    let catalog: UnifiedModelCatalogProviderPlugin | undefined;
    plugin.register?.({
      registerProvider() {},
      registerModelCatalogProvider(value: UnifiedModelCatalogProviderPlugin) {
        catalog = value;
      },
    } as never);
    const rows = await catalog!.staticCatalog!({} as never);
    expect(rows).toHaveLength(COREWEAVE_MODEL_CATALOG.length);
    expect(rows?.[0]).toMatchObject({
      kind: "text",
      provider: "coreweave",
      model: COREWEAVE_MODEL_CATALOG[0]!.id,
      label: COREWEAVE_MODEL_CATALOG[0]!.name,
      source: "static",
    });
    expect(
      await catalog!.liveCatalog!({
        config: {},
        resolveProviderApiKey: () => ({}),
      } as never),
    ).toEqual([]);
    const live = await catalog!.liveCatalog!({
      config: {},
      resolveProviderApiKey: () => ({ apiKey: "unified-test" }),
    } as never);
    expect(live?.[0]).toMatchObject({
      source: "live",
      model: COREWEAVE_MODEL_CATALOG[0]!.id,
    });
  });

  it("sends scoped credentials, releases the response, and isolates expiring cache entries", async () => {
    vi.useFakeTimers();
    const release = vi.fn().mockResolvedValue(undefined);
    guardedFetch.mockImplementation(async () => ({
      response: new Response(JSON.stringify({ data: [{ id: "MiniMaxAI/MiniMax-M3" }] })),
      finalUrl: `${COREWEAVE_BASE_URL}/models`,
      release,
    }));
    expect(await discoverCoreweaveModels("cache-key", "team/one")).toHaveLength(1);
    expect(guardedFetch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timeoutMs: 10000,
        policy: expect.any(Object),
        init: {
          headers: {
            Accept: "application/json",
            "User-Agent": expectedUserAgent,
            Authorization: "Bearer cache-key",
            "openai-project": "team/one",
          },
        },
      }),
    );
    expect(release).toHaveBeenCalledTimes(1);
    await discoverCoreweaveModels("cache-key", "team/one");
    expect(guardedFetch).toHaveBeenCalledTimes(1);
    await discoverCoreweaveModels("different-key", "team/one");
    await discoverCoreweaveModels("cache-key", "team/two");
    expect(guardedFetch).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await discoverCoreweaveModels("cache-key", "team/one");
    expect(guardedFetch).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it.each([
    new Response("", { status: 401 }),
    new Response("bad json"),
    new Response(JSON.stringify({ data: [] })),
  ])("falls back and retries unsuccessful discovery without caching it", async (response) => {
    const release = vi.fn().mockResolvedValue(undefined);
    guardedFetch.mockImplementation(async () => ({
      response: response.clone(),
      finalUrl: `${COREWEAVE_BASE_URL}/models`,
      release,
    }));
    expect(await discoverCoreweaveModels("failure-key")).toHaveLength(
      COREWEAVE_MODEL_CATALOG.length,
    );
    await discoverCoreweaveModels("failure-key");
    expect(guardedFetch).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(2);
  });

  it("falls back when the guarded request rejects", async () => {
    guardedFetch.mockRejectedValue(new Error("request timeout"));
    expect(await discoverCoreweaveModels("timeout-key")).toHaveLength(
      COREWEAVE_MODEL_CATALOG.length,
    );
  });
});
