# Catalog provenance

Catalog and lifecycle checked: 2026-10-07 UTC.

Sources:

- [CoreWeave catalog feed](https://trace.wandb.ai/inference/modelsdev/models) — 20 model IDs; response SHA-256 `1a5f647595c433e63541d582cd58ec73404eedfb0a6da5d9b2f2d1a8b00f52b7`.
- [Model lifecycle](https://docs.coreweave.com/products/inference/serverless/lifecycle) — retirement dates and recommended replacements. The page was last modified 2026-10-06.

The catalog is a static snapshot in `openclaw.plugin.json`; prices and lifecycle can change. Feed IDs, names, reasoning support, and input modalities are copied from the matching feed row. `limit.context` maps to `contextWindow`, `limit.output` to `maxTokens`, and input/output/cache-read prices remain in USD per million tokens. No feed row reports `cache_write`, so it is omitted rather than guessed.

Nine models reached their published retirement date of 2026-10-05 and were removed from the manifest and README:

| Retired model | Recommended replacement |
| --- | --- |
| `deepseek-ai/DeepSeek-V4-Flash` | `deepseek-ai/DeepSeek-V4-Flash-0731` |
| `deepseek-ai/DeepSeek-V4-Pro` | `deepseek-ai/DeepSeek-V4-Pro-0813` |
| `ibm-granite/granite-4.1-8b` | `ibm-granite/granite-4.2-8b` |
| `JetBrains/Mellum2-12B-A2.5B-Instruct` | `ibm-granite/granite-4.2-8b` |
| `meta-llama/Llama-3.1-70B-Instruct` | `meta-llama/Llama-3.3-70B-Instruct` |
| `OpenPipe/Qwen3-14B-Instruct` | `Qwen/Qwen3.8-27B` |
| `Qwen/Qwen3.6-27B` | `Qwen/Qwen3.8-27B` |
| `Qwen/Qwen3.5-35B-A3B` | `Qwen/Qwen3.6-35B-A3B` |
| `Qwen/Qwen3-30B-A3B-Instruct-2507` | `Qwen/Qwen3.6-35B-A3B` |

The currently published feed contains 20 IDs, all represented in the bundled catalog. The plugin intersects live `/models` IDs with this verified metadata and skips unknown IDs rather than guessing their limits or capabilities. Refresh the feed and lifecycle page together before the next catalog update. Streaming usage compatibility remains a separate runtime validation item.
