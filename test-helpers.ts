// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

// Local stand-in for openclaw's internal `plugin-sdk/plugin-test-runtime`,
// which is intentionally excluded from the published openclaw npm package.
// Invokes a single-provider plugin entry's register hook against a minimal
// mock plugin API and returns the registered provider plugin, exposing its
// catalog/staticCatalog `run` functions for tests.
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk/plugin-entry";
import type { ProviderPlugin } from "openclaw/plugin-sdk/plugin-entry";

/** Runs a single-provider plugin's register hook and returns the provider it registers. */
export async function registerSingleProviderPlugin(
  plugin: OpenClawPluginDefinition,
): Promise<ProviderPlugin> {
  let registered: ProviderPlugin | undefined;
  const api = {
    registerProvider(provider: ProviderPlugin) {
      registered = provider;
    },
    // The entry also registers a unified model-catalog provider; tests don't
    // exercise it, so capturing it is unnecessary.
    registerModelCatalogProvider() {},
  };
  plugin.register?.(api as never);
  if (!registered) {
    throw new Error("plugin did not register a provider");
  }
  return registered;
}
