// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

// CoreWeave Serverless Inference plugin entrypoint (formerly Weights & Biases Inference).
import {
  definePluginEntry,
  type ProviderPlugin,
  type UnifiedModelCatalogEntry,
  type OpenClawPluginDefinition,
} from "openclaw/plugin-sdk/plugin-entry";
import { resolvePluginConfigObject } from "openclaw/plugin-sdk/plugin-config-runtime";
import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";
import { normalizeOptionalString } from "openclaw/plugin-sdk/string-coerce-runtime";
import { applyCoreweaveConfig, COREWEAVE_DEFAULT_MODEL_REF } from "./onboard.js";
import { buildCoreweaveProvider, buildStaticCoreweaveProvider } from "./provider-catalog.js";

const PROVIDER_ID = "coreweave";

/** Reads the optional `team/project` openai-project scope from plugin config. */
function resolveProjectScope(ctx: {
  config?: Parameters<typeof resolvePluginConfigObject>[0];
}): string | undefined {
  return normalizeOptionalString(resolvePluginConfigObject(ctx.config, PROVIDER_ID)?.project);
}

const provider: ProviderPlugin = {
  id: PROVIDER_ID,
  envVars: ["COREWEAVE_API_KEY"],
  label: "CoreWeave",
  docsPath: "https://github.com/coreweave/serverless-inference-openclaw-plugin#readme",
  auth: [
    createProviderApiKeyAuthMethod({
      providerId: PROVIDER_ID,
      methodId: "api-key",
      label: "CoreWeave API key",
      hint: "Open models on CoreWeave GPUs (formerly Weights & Biases Inference)",
      optionKey: "coreweaveApiKey",
      flagName: "--coreweave-api-key",
      envVar: "COREWEAVE_API_KEY",
      promptMessage: "Enter CoreWeave API key",
      defaultModel: COREWEAVE_DEFAULT_MODEL_REF,
      applyConfig: (cfg) => applyCoreweaveConfig(cfg),
      noteTitle: "CoreWeave",
      noteMessage: [
        "CoreWeave Serverless Inference (formerly Weights & Biases Inference) serves",
        "open models on CoreWeave GPUs through an OpenAI-compatible API.",
        "Get your API key at: https://wandb.ai/authorize",
        "Optional: set the plugin `project` config ('team/project') to attribute usage;",
        "otherwise W&B uses your default entity and an 'inference' project.",
      ].join("\n"),
      wizard: {
        groupLabel: "CoreWeave",
        groupId: PROVIDER_ID,
        choiceId: "coreweave-api-key",
        choiceLabel: "CoreWeave API key",
        methodId: "api-key",
        groupHint: "Open models on CoreWeave GPUs (formerly Weights & Biases Inference)",
      },
    }),
  ],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey(PROVIDER_ID).apiKey;
      if (!apiKey) {
        return null;
      }
      // Optional W&B usage attribution: when set, openai-project scopes every
      // request (chat AND model discovery). When unset, W&B applies the default
      // entity and an 'inference' project, so no header is sent.
      const project = resolveProjectScope(ctx);
      return {
        provider: {
          ...(await buildCoreweaveProvider(apiKey, project)),
          apiKey,
          ...(project ? { headers: { "openai-project": project } } : {}),
        },
      };
    },
  },
  staticCatalog: {
    order: "simple",
    run: async () => ({
      provider: buildStaticCoreweaveProvider(),
    }),
  },
};

function catalogRows(
  models: ReturnType<typeof buildStaticCoreweaveProvider>["models"],
  source: "static" | "live",
): UnifiedModelCatalogEntry[] {
  return models.map((model) => ({
    kind: "text",
    provider: PROVIDER_ID,
    model: model.id,
    label: model.name,
    source,
  }));
}

// Explicit annotation keeps the emitted .d.ts portable: without it tsdown's
// dts step (TS2883) cannot name the inferred type without referencing
// openclaw's internal type chunk paths.
const plugin: OpenClawPluginDefinition = definePluginEntry({
  id: PROVIDER_ID,
  name: "CoreWeave",
  description: "CoreWeave Serverless Inference model provider plugin for OpenClaw",
  register(api) {
    api.registerProvider(provider);
    api.registerModelCatalogProvider({
      provider: PROVIDER_ID,
      kinds: ["text"],
      staticCatalog: () => catalogRows(buildStaticCoreweaveProvider().models, "static"),
      liveCatalog: async (ctx) => {
        const result = await provider.catalog!.run(ctx);
        return result && "provider" in result ? catalogRows(result.provider.models, "live") : [];
      },
    });
  },
});

export default plugin;
