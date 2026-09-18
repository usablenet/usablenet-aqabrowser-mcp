# <img src="aqabrowser/assets/icon.png" alt="" width="40" align="absmiddle"> UsableNet AQA Browser

Drive the UsableNet AQA for Agents Chrome extension from your coding agent. Start QA sessions, run accessibility evaluations, summarize results, and export annotated HTML reports — with the AQA extension installed in the user's regular Chrome.

Works with **Claude Code**, **Codex**, **Cursor**, **VS Code Copilot**, and
any other MCP client. Current version: `0.3.1`.

## What you need

1. **Chrome with the UsableNet AQA for Agents extension** installed (Chrome Web
   Store, or an unpacked development build). The plugin drives *your* browser —
   it never opens one of its own.
2. **The AQA panel opened once** on your Chrome profile, with a team and a
   ruleset selected. Analyses use those saved choices unless you ask for
   different ones.
3. **A coding agent on the same machine as Chrome** — one of the hosts
   below. Sandboxed agents (for example Claude Cowork) cannot reach your
   Chrome; see Troubleshooting.

## Install

### Claude Code

```
/plugin marketplace add https://github.com/usablenet/usablenet-aqabrowser-mcp.git
/plugin install aqa@UsableNet
```

Run `/reload-plugins` (or start a new session) and `/help` lists the
`/aqa:*` commands.

### Codex (CLI and the ChatGPT desktop app)

```
codex plugin marketplace add https://github.com/usablenet/usablenet-aqabrowser-mcp.git
codex plugin add aqa@UsableNet
```

Start a **new** session afterwards — plugins load at session start. In the
desktop app the same marketplace appears under **Plugins**, where UsableNet AQA Browser
installs with one click.

### Cursor

From the agent window: **Customize** → **Plugins** → **+ Add** →
**From Local Repo** → select the `aqabrowser/` folder of a local clone of
this repository (the repository root is the marketplace catalog; the plugin
lives in that folder).

### VS Code (GitHub Copilot)

From the Chat panel: gear icon → **Plugins** → **Install Plugin from
Source** → enter `usablenet/usablenet-aqabrowser-mcp`.

### Other MCP clients

Run `node aqabrowser/print-config.js` — it prints ready-to-paste registration
snippets (VS Code `code --add-mcp`, Codex `config.toml`, Gemini CLI, and
generic `mcpServers` JSON) with this install's absolute paths filled in.
To give the agent the same task guidance the plugin hosts get, copy
`aqabrowser/skills/` into your project's `.github/skills/` (Copilot) or your
client's equivalent.

## First run: pair the extension

The plugin and the extension talk over a local connection that has to be
authorized once per machine.

1. Ask your agent to **set up the AQA bridge** (on Claude Code:
   `/aqa:setup-bridge`). It replies with a pairing code, a diagnosis of
   the connection, and the exact steps that apply.
2. Paste the code into the extension: **Settings → Connection → MCP bridge**,
   then **Save**.
3. Ask again — it should now report the bridge as connected and list your
   open tabs.

The same code is printed in the MCP server's log every time it starts, and
stored at `~/.aqa/bridge-secret`. If you delete or regenerate that file,
pair again with the new code.

## Using it

Talk to your agent in plain words — it picks the right AQA action from your
wording. On Claude Code every task below is also a slash command (see the
table at the end). A typical session:

1. **Start on a tab.** Open the page in Chrome and say *"start an AQA
   session on this tab"* (or *"…on https://example.com"* to open a new
   tab, or *"…on the pricing tab"* for another open tab). The agent binds
   itself to that tab and keeps working on it even while you browse
   elsewhere. If you already started a session from the AQA panel, the
   agent adopts it instead of starting a new one.
2. **Analyze.** *"Analyze this page"* — you get the totals by status and
   severity and the rules with the most issues. Name a team, ruleset pack
   or ruleset in the same sentence to override the panel's saved choices
   for that run. Results stay cached per tab: *"show me the last
   analysis"* re-reads them without running AQA again.
3. **Drill in.** *"Show me the high-severity issues"*, *"which issues are
   about images?"*, *"what's flagged under WCAG 1.4.3?"*, *"what are the
   easy fixes?"*, or, for one issue, *"what's wrong with AI3 and how do I
   fix it?"*. Issue ids come from the panel's **Copy ID** button or from
   the exported report: ids starting with `AI` are automatic issues
   (*needs fix*), ids starting with `AM` are manual checks (*check
   manually*).
4. **Export.** *"Export the report"* writes a self-contained HTML file: the
   annotated screenshot, a heatmap, and one card per *needs fix* issue with
   AQA's remediation. Add a filter (*"…only the high-severity issues"*)
   for a scoped report, or *"…including the manual notes"* to add the
   check-manually and reviewed-ok items. Add *"with code fixes"* and the
   agent proposes fixes from AQA's remediations for your codebase and
   embeds them in the report as before/after diffs; your source files are
   only edited if you ask for it.
5. **Manual-review items.** Some notes need a human decision. *"Verify the
   alt text on AM4"* or *"is AM7 actually visible on the page?"* makes the
   agent look at the real pixels and walk AQA's own checklist to a verdict.
   *"Review the manual notes"* does that for every manual check on the
   page: it gathers the evidence group by group, saves the verdicts it can
   ground (each with its reason), leaves the rest as *check manually*, and
   re-exports the report with the manual sections. *"Mark AM4 as reviewed
   ok"* records one status, with the reason, in AQA.
6. **Whole site.** *"Audit https://example.com"* crawls the site, shows you
   the pages it picked and the output folder, then analyzes each page,
   writing per-page reports plus one `audit.html` summary. Add *"and
   review the manual notes"* to include step 5 on every page. To prune the
   page list first, ask to *"crawl example.com and pick the pages"* — that
   saves the shortlist as a flow without running AQA; *"audit example.com
   from the saved crawl flow"* runs it later. The crawler reads public,
   static HTML only: pages behind a login or in a JavaScript-only app need
   a flow (next step).
7. **Repeatable paths.** *"Save a flow: open the home page, open the menu,
   run AQA"* stores the steps without running them; *"run home-menu"*
   replays the flow in the session's tab and reports one analysis per
   checkpoint; *"what flows do I have?"* lists them.
8. **Finish.** *"End the session"* ends it without saving. Add *"and save
   it as <name>"* to resume it later from the panel's **Saved sessions**,
   or *"and save my changes"* to update the saved session this tab was
   resumed from. *"Reset the session"* discards everything.

Whenever a term is unclear (*needs fix* vs *check manually*, *ruleset pack*,
*exposure*…), just ask — the agent has AQA's glossary.

### Where files land

Reports go to `./reports/` (site audits to `./reports/audit-<host>/`; the
code-fix files land next to their report) and saved flows to
`.aqa/flows/`. On Claude Code and VS Code those paths are inside your
project. Codex and Cursor don't tell the server which project is open, so
there they resolve under your home directory (`~/reports`, `~/.aqa/flows`)
— name an absolute path (*"export the report to /path/to/dir"*) or see
**Configuration** to anchor them.

## Configuration

**Bridge port.** The plugin and the extension must agree on it (default
`31773`). Change it with the plugin's **Bridge port** option (Claude Code
`/plugin`), or with `AQA_BRIDGE_PORT` / `--bridge-port` for manual
registrations — **and** in the extension's **Settings → Connection**. Up to
eight agent sessions can run at once, each on the next free port; the
extension's **Connections** list shows which host holds each one.

**Workspace anchor.** `--workspace-dir <dir>` (or `AQA_WORKSPACE_DIR`)
sets where relative report and flow paths resolve for hosts that don't share
the open project (Codex, Cursor). In Cursor you can register the server in a
project-level `.cursor/mcp.json` with `--workspace-dir ${workspaceFolder}`.
The plugin's per-host `print-config.js` snippets show the full command.

## Troubleshooting

- **AQA tools fail because the extension isn't connected.** The error names
  one of three situations, and asking for the bridge setup gives the same
  diagnosis with the steps. *"…pairing code does NOT match…"*: paste the
  current code into the extension and Save — no reload needed. *"…disconnected
  from the bridge…"*: Chrome put the extension to sleep; it reconnects within
  ~30s, just retry. *"No pairing attempt … has reached this server"*: reload
  the extension at `chrome://extensions`, make sure its pairing-code field
  isn't empty and the bridge toggle is on, and check the port matches.
- **"every bridge slot is busy".** Eight sessions are alive, or stale
  servers are holding the ports. Close sessions you don't need; the
  extension's **Connections** list names the host behind each one. Stale
  holders: `lsof -ti :31773-31780 | xargs kill`.
- **"no-session-tab" / "tab-not-found".** The agent isn't bound to a tab,
  or its tab was closed. Say which tab to work on, or give it a URL.
- **"no cached analysis" / stale results.** The page changed since the last
  analysis — ask for a new one.
- **Cursor shows a "Connect / Authenticate" card for UsableNet AQA Browser.** Press **Skip**
  — there is no login; it means the server didn't start. Check the port and
  the pairing, then reload the plugin.
- **Claude Cowork and other sandboxed agents.** Not supported: the agent
  runs in a VM while Chrome runs on your machine, so the two can never meet.
  Use a terminal Claude Code session on the same machine as Chrome.

## Commands

Every task above is a skill the agent applies from your wording. On Claude
Code they are also slash commands:

| Command | What it does |
| --- | --- |
| `/aqa:analyze-page` | Run AQA on the page you are working on and get the totals by status and severity plus the rules with the most issues. |
| `/aqa:apply-fixes` | Embed proposed code fixes into an exported HTML report as before/after diffs, one per issue. |
| `/aqa:audit-site` | Audit selected site pages, review manual notes when requested, and save per-page outcomes plus an audit summary. |
| `/aqa:crawl-site` | Crawl a site from a starting URL and save the shortlist of pages worth testing as a reusable flow, without running AQA yet. |
| `/aqa:end-session` | End the current session, optionally saving it in AQA so you can resume it later from the panel. |
| `/aqa:export-report` | Export a self-contained HTML report: annotated screenshot, heatmap, and one card per issue with AQA's remediation. |
| `/aqa:flow` | Save a sequence of browser steps with AQA checkpoints as a named flow, run a saved flow, or list them. |
| `/aqa:get-issue` | Explain one issue by its id: what AQA flagged, why, and how to fix it based on AQA's remediation. |
| `/aqa:glossary` | Look up what an AQA term means: needs fix, check manually, ruleset pack, exposure, and so on. |
| `/aqa:last-analysis` | Show the results of the most recent analysis of the current tab without running it again. |
| `/aqa:query-issues` | List the issues matching a filter: severity, status, WCAG number, element type, technology, or a keyword. |
| `/aqa:reset-session` | Stop the current session and discard its state without saving anything. |
| `/aqa:review-manual-notes` | Review manual notes with evidence, save confirmed outcomes in batches, and export the remaining checks. |
| `/aqa:setup-bridge` | Show the pairing code and connection status, with the steps to pair the extension or fix a stuck connection. |
| `/aqa:start-session` | Start inspecting a tab (the current one, a specific one, or a new one opened at a URL); later requests target that tab. |
| `/aqa:verify-image-alt` | Check whether an image's alt text really describes what the image shows (WCAG 1.1.1). |
| `/aqa:verify-visibility` | Check whether a flagged element is really visible on screen, not hidden behind a banner or off the page. |
