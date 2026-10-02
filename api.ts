// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

// CoreWeave API module exposes the plugin public contract.
export {
  buildCoreweaveModelDefinition,
  COREWEAVE_BASE_URL,
  COREWEAVE_DEFAULT_MODEL_REF,
  COREWEAVE_MODEL_CATALOG,
  discoverCoreweaveModels,
} from "./models.js";
export { buildCoreweaveProvider, buildStaticCoreweaveProvider } from "./provider-catalog.js";
