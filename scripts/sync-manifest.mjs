// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: serverless-inference-openclaw-plugin

import { writeFileSync } from "node:fs";
import packageMetadata from "../package.json" with { type: "json" };
import manifest from "../openclaw.plugin.json" with { type: "json" };

manifest.modelCatalog.providers.coreweave.headers["User-Agent"] =
  `openclaw-coreweave/${packageMetadata.version}`;
writeFileSync(new URL("../openclaw.plugin.json", import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
