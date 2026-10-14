# UsableNet AQA Browser — the npm channel's catalog

This branch is a plugin marketplace for Claude Code and Codex. Its one
entry names the npm package `@usablenet-public/usablenet-aqabrowser-mcp` on
`https://usablenet.jfrog.io/artifactory/api/npm/npm-usablenet-public/`; the plugin itself, its user guide and its
releases live on the `main` branch and on that registry.

Put the registry in `~/.npmrc` first — the hosts fetch the package with npm, and no account or token is needed:

```
@usablenet-public:registry=https://usablenet.jfrog.io/artifactory/api/npm/npm-usablenet-public/
```

Then add the marketplace and install the plugin:

```
/plugin marketplace add usablenet/usablenet-aqabrowser-mcp#npm
/plugin install aqa@UsableNet
```

```
codex plugin marketplace add usablenet/usablenet-aqabrowser-mcp@npm
codex plugin add aqa@UsableNet
```

A machine registers one marketplace per name: if `main` is already
registered as `UsableNet` (it installs the same plugin from Git), remove
it first. The entries carry no version, so this catalog follows the
registry's latest release and does not change between releases.

Licensed under the Apache License 2.0 (see `LICENSE`). The UsableNet AQA for
Agents extension and the AQA backend it talks to are proprietary — see the
package README.
