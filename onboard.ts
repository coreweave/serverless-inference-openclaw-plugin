// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

// CoreWeave onboarding config helpers for API-key setup.
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import { buildStaticCoreweaveProvider } from "./provider-catalog.js";
import { COREWEAVE_DEFAULT_MODEL_REF } from "./models.js";

export { COREWEAVE_DEFAULT_MODEL_REF };

export function applyCoreweaveConfig(cfg: OpenClawConfig): OpenClawConfig {
  const defaults = cfg.agents?.defaults;
  const existing = cfg.models?.providers?.coreweave;
  const catalog = buildStaticCoreweaveProvider();
  const models = existing?.models ?? [];
  const primary = typeof defaults?.model === "string" ? defaults.model : defaults?.model?.primary;
  return {
    ...cfg,
    models: {
      ...cfg.models,
      mode: cfg.models?.mode ?? "merge",
      providers: {
        ...cfg.models?.providers,
        coreweave: {
          ...existing,
          ...catalog,
          models: [
            ...models,
            ...catalog.models.filter((row) => !models.some((model) => model.id === row.id)),
          ],
        },
      },
    },
    agents: {
      ...cfg.agents,
      defaults: {
        ...defaults,
        model: primary?.trim()
          ? defaults!.model
          : {
              ...(typeof defaults?.model === "object" ? defaults.model : {}),
              primary: COREWEAVE_DEFAULT_MODEL_REF,
            },
        models: {
          ...defaults?.models,
          [COREWEAVE_DEFAULT_MODEL_REF]: {
            ...defaults?.models?.[COREWEAVE_DEFAULT_MODEL_REF],
            alias: defaults?.models?.[COREWEAVE_DEFAULT_MODEL_REF]?.alias ?? "Kimi K2.6",
          },
        },
      },
    },
  };
}
