// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";

export type ModelProviderConfig = NonNullable<
  NonNullable<OpenClawConfig["models"]>["providers"]
>[string];
export type ModelDefinitionConfig = ModelProviderConfig["models"][number];
