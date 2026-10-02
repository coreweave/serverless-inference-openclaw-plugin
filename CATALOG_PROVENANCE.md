# Catalog provenance

Catalog and published lifecycle checked: 2026-09-22 UTC.

Sources:

- https://trace.wandb.ai/inference/modelsdev/models — CoreWeave-owned rich feed, 29 model IDs (checked September 22 at 17:26 UTC).
- https://docs.wandb.ai/inference/lifecycle — retired IDs and October 5 retirements.

The source feed response has SHA-256 `4fd2eacca3f8f8ca88353220bfa54e5ace7c126dcd3461e176f86669053cf49a`. The plugin manifest is a static snapshot; prices and lifecycle can change.

The September 22 refresh first added `deepseek-ai/DeepSeek-V4.1-Flash`. A later same-day feed added verified metadata for `google/gemma-4-26B-A4B-it`, which is now included; all 28 previously verified records remain unchanged. The saved same-day authenticated `/models` response also contains `Qwen/Qwen3-235B-A22B-Instruct-2507`. That ID remains excluded because it is retired and absent from the rich feed.

Each manifest ID/name/reasoning/input modality comes directly from the matching feed row. `limit.context` maps to `contextWindow`; `limit.output` maps to `maxTokens`; cost `input`/`output` retain USD per million tokens and `cache_read` maps to `cacheRead`. No feed row reports `cache_write`, so this field is omitted rather than asserting a rate. OpenClaw may normalize an omitted rate to its internal default; that is not a published CoreWeave cache-write price.

Seven exact retired IDs from the prior manifest are excluded. Plain Kimi-K2.5 and GLM-5.1 are also absent from this verified feed; their omission is not a claim that differently named retired variants are equivalent. The September 14 `/models` response advertised retired `Qwen/Qwen3-235B-A22B-Instruct-2507`; discovery therefore intersects live IDs with this verified manifest and warns about unsupported IDs instead of guessing metadata.

The following nine deprecated IDs remain in this snapshot because their published retirement date is October 5, 2026 (extended from September 28):

- deepseek-ai/DeepSeek-V4-Flash
- deepseek-ai/DeepSeek-V4-Pro
- ibm-granite/granite-4.1-8b
- JetBrains/Mellum2-12B-A2.5B-Instruct
- meta-llama/Llama-3.1-70B-Instruct
- OpenPipe/Qwen3-14B-Instruct
- Qwen/Qwen3.6-27B
- Qwen/Qwen3.5-35B-A3B
- Qwen/Qwen3-30B-A3B-Instruct-2507

Refresh the rich feed and lifecycle source together before updating this snapshot. Remove retired entries in a catalog update when their retirement takes effect; this static snapshot does not schedule removals automatically. The feed is metadata evidence, not a test of every model. Streaming usage compatibility remains an independent runtime validation item.
