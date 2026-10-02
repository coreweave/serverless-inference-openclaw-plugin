// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

import { defineConfig } from "tsdown";

// Bundle the plugin entry (and the inlined manifest JSON) into dist/index.js.
// The OpenClaw host provides `openclaw/plugin-sdk/*` at runtime, so it is kept
// external and never bundled into the published artifact.
export default defineConfig({
  entry: ["index.ts"],
  format: "esm",
  platform: "node",
  dts: true,
  clean: true,
  deps: { neverBundle: [/^openclaw(\/|$)/] },
  // Emit dist/index.js (not .mjs) to match the runtimeExtensions entry in
  // package.json. The package is `"type": "module"`, so a bare .js is ESM.
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
});
