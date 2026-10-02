# CoreWeave plugin icon

`icon.png` is the plugin identity artwork for OpenClaw catalogs, settings, and
installation cards. OpenClaw discovers this fixed package path without a manifest
field. Provider authentication artwork is managed separately by OpenClaw's catalog.

The symbol in `coreweave-symbol.svg` was extracted from the navigation logo on the
[official CoreWeave website](https://www.coreweave.com/) on September 17, 2026. It
uses the same path geometry as the CoreWeave symbol submitted in
[models.dev PR #7335](https://github.com/anomalyco/models.dev/pull/7335).
The wordmark is omitted, and a square viewBox centers the symbol without distortion.

The PNG renders that SVG at 512 by 512 pixels with a transparent background. The
"C" is CoreWeave blue (`#004AE1`); the "W" is dark (`#1A1A1A`) with a thin white
outline, so the mark remains visible in light and dark interfaces using a single
static image. The white stroke is painted behind the original filled paths.
Only `icon.png` is included in the published package; the SVG is retained here as
its editable source.

To regenerate with the `sharp` Node.js package available:

```js
const fs = require("node:fs/promises");
const sharp = require("sharp");

(async () => {
  const svg = await fs.readFile("assets/coreweave-symbol.svg");
  await sharp(svg, { density: 384 })
    .resize(512, 512)
    .png()
    .toFile("assets/icon.png");
})();
```

See the [OpenClaw plugin icon contract](https://docs.openclaw.ai/plugins/manifest/surfaces#plugin-icon).
