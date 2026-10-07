# CoreWeave Serverless Inference — OpenClaw provider plugin

An [OpenClaw](https://github.com/openclaw/openclaw) model provider plugin for
**CoreWeave Serverless Inference** (formerly **Weights & Biases Inference**) —
open models (Kimi, GLM, DeepSeek, Qwen, Llama, Nemotron, gpt-oss, …) served on
CoreWeave GPUs through an OpenAI-compatible API. Authenticate with your existing
Weights & Biases account.

Provider id: `coreweave` · Model refs: `coreweave/<vendor>/<model>` (e.g.
`coreweave/moonshotai/Kimi-K2.6`).

## Install

```bash
openclaw plugins install clawhub:@coreweave/serverless-inference
openclaw gateway restart
openclaw plugins inspect coreweave --runtime --json
```

## Setup

Get an API key at [wandb.ai/authorize](https://wandb.ai/authorize), then:

```bash
# Interactive
openclaw onboard --auth-choice coreweave-api-key

# Or via environment variable
export COREWEAVE_API_KEY="your-key"

# Non-interactive
openclaw onboard --non-interactive \
  --auth-choice coreweave-api-key \
  --coreweave-api-key "your-key"
```

Verify:

```bash
openclaw models list --provider coreweave
openclaw agent --model coreweave/moonshotai/Kimi-K2.6 --message "Hello, are you working?"
```

## Project attribution (optional)

CoreWeave Serverless Inference can attribute usage to a specific W&B
team/project via an `openai-project` header. This is **optional** — if you omit
it, W&B uses your default entity and a project named `inference`. Set it only
when you belong to more than one team or want usage attributed to a specific
project:

```json5
{
  plugins: {
    entries: {
      coreweave: {
        config: { project: "my-team/my-project" },
      },
    },
  },
}
```

When `project` is set, OpenClaw attaches `openai-project: team/project` to every
request (chat and model discovery). When unset, no header is sent.

## Models

The plugin ships a verified catalog and filters it by IDs returned from the live `/v1/models`
endpoint, falling back to the bundled catalog if discovery fails or returns no rows. Catalog
metadata was checked on **2026-10-07** against the [CoreWeave catalog feed](https://trace.wandb.ai/inference/modelsdev/models). Models past their published retirement date are excluded. See [catalog provenance](./CATALOG_PROVENANCE.md)
for field mapping and lifecycle details.

| Model ID | Context tokens | Input | Reasoning |
| --- | --- | --- | --- |
| `moonshotai/Kimi-K2.7-Code` | 262144 | text, image | Yes |
| `moonshotai/Kimi-K2.6` | 262144 | text, image | Yes |
| `deepseek-ai/DeepSeek-V3.1` | 161000 | text | No |
| `Qwen/Qwen3.6-35B-A3B` | 262144 | text, image | Yes |
| `nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B` | 262144 | text | Yes |
| `openai/gpt-oss-120b` | 131072 | text | Yes |
| `openai/gpt-oss-20b` | 131072 | text | Yes |
| `google/gemma-4-31B-it` | 262144 | text, image | Yes |
| `meta-llama/Llama-3.3-70B-Instruct` | 128000 | text | No |
| `meta-llama/Llama-3.1-8B-Instruct` | 131072 | text | No |
| `ibm-granite/granite-4.2-8b` | 131072 | text | Yes |
| `MiniMaxAI/MiniMax-M3` | 262144 | text, image | Yes |
| `zai-org/GLM-5.3-Flash` | 1048576 | text, image | Yes |
| `zai-org/GLM-5.2` | 1048576 | text | Yes |
| `nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B` | 262144 | text | Yes |
| `Qwen/Qwen3.8-27B` | 262144 | text, image | Yes |
| `deepseek-ai/DeepSeek-V4-Pro-0813` | 1048576 | text | Yes |
| `deepseek-ai/DeepSeek-V4-Flash-0731` | 262144 | text | Yes |
| `deepseek-ai/DeepSeek-V4.1-Flash` | 1048576 | text, image | Yes |
| `google/gemma-4-26B-A4B-it` | 262144 | text, image | Yes |

`openclaw models list --provider coreweave` shows live model IDs that have verified metadata in this plugin. IDs missing from the verified catalog are skipped with a warning; update the plugin or configure their confirmed metadata explicitly. This prevents a stale discovery response from reintroducing a retired model.

## Config file example

```json5
{
  env: { COREWEAVE_API_KEY: "..." },
  plugins: { entries: { coreweave: { config: { project: "my-team/my-project" } } } },
  agents: { defaults: { model: { primary: "coreweave/moonshotai/Kimi-K2.6" } } },
  models: {
    mode: "merge",
    providers: {
      coreweave: {
        baseUrl: "https://api.inference.wandb.ai/v1",
        apiKey: "${COREWEAVE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "moonshotai/Kimi-K2.6",
            name: "Kimi K2.6",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.65, output: 3.41, cacheRead: 0.15 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
        ],
      },
    },
  },
}
```

## Troubleshooting

- **API key not recognized** — check that `COREWEAVE_API_KEY` is set without printing its value; rotate at
  [wandb.ai/authorize](https://wandb.ai/authorize).
- **Attributing usage to a team/project** — usage attribution is optional; set
  the `project` plugin config to `team/project` if you belong to multiple teams.
- **Connection issues** — the endpoint is `https://api.inference.wandb.ai/v1`;
  ensure your network allows HTTPS to that host.

## Development

```bash
npm install        # installs openclaw (peer) + build/test tooling
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run build      # tsdown -> dist/index.js (+ .d.ts)
```

The published package ships built JavaScript: `openclaw.runtimeExtensions`
points at `./dist/index.js`, and `prepublishOnly` runs the build.

## Publishing to ClawHub

Use the current [ClawHub CLI](https://docs.openclaw.ai/clawhub/cli) from a
reviewed checkout containing the intended release changes. Confirm the release
version in `package.json` before building. From the repository root:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
clawhub package validate .
clawhub package publish . --family code-plugin --owner coreweave --dry-run
```

The source argument `.` is the local package folder. ClawHub packs its contents
into an npm tarball; the package name is read from `package.json`. Publishing to
npm is not required for the `clawhub:` installation route.
Review the dry-run output for the intended package name, version, GitHub
repository, and exact source commit before publishing.

An account with publishing access to the `coreweave` ClawHub owner must perform
the release. GitHub repository access does not grant that permission. From the
same unchanged checkout:

```bash
clawhub login
clawhub whoami
clawhub package publish . --family code-plugin --owner coreweave --wait
clawhub package inspect @coreweave/serverless-inference --json
```

`--wait` waits for publication checks; an accepted upload alone does not mean
the version is publicly installable. After publication, verify the reported
version, then run the installation and setup steps above in a clean OpenClaw
environment. Check model listing, streaming, and a tool-driven read/edit/reread
on the supported runtime before declaring the release verified. See the
[ClawHub publishing requirements](https://docs.openclaw.ai/clawhub/publishing)
for ownership and release visibility details.

## License

MIT — see [MIT license](./LICENSES/MIT.txt).
