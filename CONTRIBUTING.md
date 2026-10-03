# Contributing to serverless-inference-openclaw-plugin

CoreWeave members with write access may submit pull requests. External users may
submit issues, but external pull requests are not accepted.

## Contribution License Agreement

Contributors must agree to the [CoreWeave CLA](./CLA.md) when pushing code to this project.

Agreement with the CoreWeave CLA must be signified by including a `Signed-Off-By`
trailer in every submitted Git commit to this repository. By signing off, you
certify that you have the right to submit the contribution and that you agree to
and are bound by the CoreWeave Contributor License Agreement in effect at the date
of your submission, found in [CLA.md](./CLA.md), which governs your submission. If
you are contributing on behalf of an entity, you further certify that you are
authorized to bind that entity to the CLA.

Individual commits can be signed using the `--signoff` option to
[`git commit`](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---signoff);
or a repo as a whole can use the `commit.signoff` configuration option.

## License headers
<!--- REUSE-IgnoreStart -->

Source code should contain an SPDX-style license header, reflecting:
- Year & Copyright owner
- SPDX License identifier `SPDX-License-Identifier: MIT`
- Package Name: `SPDX-PackageName: serverless-inference-openclaw-plugin`

This can be partially automated with [FSFe REUSE](https://reuse.software/dev/#tool)
```shell
reuse annotate --license MIT --copyright 'CoreWeave, Inc.'  --year 2026 --template default_template --skip-existing $FILE
```

Blindly adding the headers to every file without review risks assigning the
wrong copyright owner! You should endeavor to understand who owns
contributions!

- The serverless-inference-openclaw-plugin source is licensed under the MIT license to protect the
  rights of all parties.

Licensing state & SPDX bill-of-materials (BOM) can be valiated & generated with:
```shell
reuse lint
reuse spdx
```

<!--- REUSE-IgnoreEnd -->
