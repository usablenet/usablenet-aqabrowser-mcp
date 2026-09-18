---
name: crawl-site
description: Crawl a website from a starting URL and save an `aqa-flow` file that walks every selected page and runs AQA on each
argument-hint: "<startUrl>"
metadata:
  user-summary: "Crawl a site from a starting URL and save the shortlist of pages worth testing as a reusable flow, without running AQA yet."
---

When invoked as part of an explicitly requested site audit, that request already authorizes the bounded crawl with default caps. Continue without a repeated confirmation; ask only when the scope exceeds the user's constraints.

The user wants to scope an AQA audit across a whole site, not a single page. They'll paste a starting URL and ask *"crawl `<domain>` and pick the pages to test"* / *"which pages should I audit"* / *"build a flow that runs AQA across the site"*, or you'll arrive here as the page-selection step of `/aqa:audit-site`. When the user asks for the audit itself (*"audit this site"*, *"run an a11y audit on `<site>`"*, a landed report), route to `/aqa:audit-site` instead — it runs this crawl as its first step and then the audit; don't stop at the shortlist for that ask.

The command's deliverable is **one saved flow file at `.aqa/flows/crawl-<host>.json`** that a runner consumes — the `aqa-audit-runner` subagent (per-page reports + `audit.html`) or `/aqa:flow run crawl-<host>` (digests only). The agent's structured verdict is what you render to the user; the file is what the next slash command consumes.

**Scope.** This command answers *which pages should an AQA reviewer cover for a site-wide audit*. It does NOT answer:

- *Run AQA on these pages* — that's `/aqa:audit-site` (crawl + run + summary in one command) or, once this crawl has landed, the `aqa-audit-runner` subagent / `/aqa:flow run <slug>` on the saved flow. This command stops at the saved flow; never loop `aqa_analyze_page` over the URLs inline.
- *Audit one specific page* — go straight to `/aqa:analyze-page`; crawling one URL to produce a list of one URL is wasted work.
- *Audit pages behind a login* — the crawler is unauthenticated and won't follow login flows. Authenticated areas need extension-driven inspection through the panel.
- *Audit a SPA whose static HTML is empty* — the crawler reads static HTML only. When it detects an SPA shell with no internal links, it returns inconclusive; the user has to drive navigation via the extension instead.

The right entry point for the site-shortlist question is the **`aqa-crawl-site` subagent**, not a direct WebFetch chain. The agent runs the structured robots + sitemap + BFS workflow and returns one block (`pages`, `stats`, `notes`) instead of a long unstructured trace.

Step 1 — pull the starting URL from the user's message. Don't paraphrase it; pass exactly what the user typed (the agent does its own normalization). If the user invoked the command with no URL (e.g. just `/aqa:crawl-site`), ask them which URL to start from before going further — don't guess from the active Chrome tab, don't fall back to the most recent `aqa_analyze_page` target, and don't assume `https://` if they gave you a bare hostname (the agent rejects unsupported schemes; let the user be explicit). One short clarifying question, then resume at Step 2 once they answer.

Step 2 — **show the default caps and flow name; ask to confirm only if the request has not already authorized this bounded crawl**. Crawling makes 1–60+ outbound HTTP calls to a site the user doesn't necessarily own, AND it writes a file to `.aqa/flows/`. Phrasing template:

> "I can crawl `<origin>` from `<startUrl>` and save the audit as `.aqa/flows/crawl-<host>.json` (the saved flow is what the audit runs from). Default caps: `maxPagesCrawled: 60`, `maxDepth: 3`, `maxReturn: 25`. Tighten any of those, rename the flow, or OK to start?"

If the user says yes (or adjusts the caps / slug and says go), invoke the `aqa-crawl-site` subagent with `{ startUrl: "<url>", maxPagesCrawled: <n>, maxDepth: <n>, maxReturn: <n>, flowName: "<slug>" }`. Omit `flowName` when the user didn't override it — the agent defaults to `crawl-<host>`.

If the user declines, or doesn't respond clearly, **do not call `WebFetch` yourself to crawl** and **do not call `aqa_flow_save` to fabricate a flow** — both are the agent's job, and doing either inline blows the structured-output contract every downstream slash command depends on. *"I do"* / *"I will"* / *"let me"* in response to your prompt mean the *user* will do it themselves; same rule as commits and image-byte fetches.

Step 3 — once the subagent returns, present the shortlist + the saved flow to the user.

- Lead with `outcome` AND the flow path: when `ok`, *"Crawled `<origin>` — `<stats.pagesCrawled>` pages observed, `<pages.length>` representative URLs selected. Saved as `<flowName>` at `<flowPath>`."* When `inconclusive`, name the `reason` plainly, note that no flow file was written, and offer a recovery (see below).
- Render `pages` as a short table or list: `label` + `url` + `why` + `source` is the load-bearing quartet. The `label` is what the user will see in the run report's checkpoint rollup, so surface it. Skip `fingerprintKey` / `depth` / `landmarks` unless the user asks for them — they're audit metadata, not user-facing decisions. Mark any row with `looksLikeSpa: true` with a `(SPA shell)` flag so the user knows that page's `analyze` step may return a degraded digest.
- Surface `notes.spaSuspected: true` (if set) as a one-line caveat: the static-HTML crawl saw SPA shells and the shortlist may be undercounting templates that only exist after JS execution. Suggest `/aqa:flow` author mode for stateful flows.
- Surface `notes.statefulPagesObserved` (if set) as a one-line caveat: some pages need interaction (open menu / click into) to reach — those weren't included; user should author them via `/aqa:flow`.
- Surface `notes.redirectedTo` (if set) as a one-line note: the agent re-anchored the origin because the start URL redirected.
- Surface `stats.robotsTxt` when it's `'missing'` (note that the crawl proceeded without robots constraints) or `'disallows-all'` (then `outcome === 'inconclusive'` and we should NOT have a list — covered by the inconclusive branch below).
- Surface non-empty `stats.fetchFailures` as a brief tally — *"3 pages failed to fetch (404, 503, 503)"* — not a full enumeration. The reviewer doesn't need every dead URL; they need to know coverage was partial.

**Don't dump the JSON verbatim**, **don't summarize each `why` into a paragraph** (the values are already terse on purpose), and **don't open / Read the flow file to display its contents** — the user knows what's in it from the rendered shortlist; reading the file just to re-display it is a wasted round-trip.

Step 4 — if this crawl belongs to an already requested audit, return the plan to audit-site and continue its page-by-page execution, preserving any requested manual review. Do not ask to start the audit again. For a standalone crawl-only request, offer the obvious next step.

> "Run the audit now? Two shapes: (a) the full audit — per-page HTML reports plus one `audit.html` summary under `./reports/audit-<host>/`, 30s–2min per page; (b) digests only — `/aqa:flow run <flowName>` walks every page and returns one digest per checkpoint, no files written. Or open `<flowPath>` first if you want to prune before running — the file is just JSON, drop steps and re-save."

For a standalone crawl-only request, don't auto-launch either shape. The whole reason this command stops at the saved flow is so the user can prune before paying for N evaluations. Wait for explicit go. *"I do"* / *"I will"* in response means the user runs it themselves; don't launch on their behalf without an unambiguous yes — same rule as commits.

On a yes for (a), invoke the `aqa-audit-runner` subagent with `{ flowName: "<flowName>" }` (it derives `outDir` from the flow's `startUrl`) and present its verdict the way the "Save and present the outcome" section of `/aqa:audit-site` describes. On a yes for (b), hand off to the `aqa-flow` subagent via `/aqa:flow run <flowName>`. For those scans-only follow-ups, use the existing runners instead of duplicating their loop — the runners record per-step success, respect per-step `onError`, and assemble one structured report; re-implementing that inline forks the audit-execution path.

### Handling `outcome: 'inconclusive'`

Name the specific `reason` and offer one concrete follow-up — don't generic-advice it.

- `no-start-url` — you forgot to pass the URL through to the agent. Ask the user for it (this should have been caught at Step 1; if you hit this, it's a bug in the slash command flow, not the user's input).
- `unsupported-scheme` — the user gave a non-http(s) URL. Ask them to provide an `https://` URL.
- `non-html-start` — the URL points to a file resource (`.pdf`, image, etc.). Ask for the HTML page that owns it.
- `origin-mismatch` — the start URL redirected to a different origin and the agent didn't auto-re-anchor (rare; only happens for mid-crawl cross-origin redirects). Suggest the user pass the redirected origin directly.
- `single-page-request` — the input looked like a single-page audit ask. Suggest `/aqa:analyze-page` instead.
- `robots-disallows-all` — the site's `robots.txt` blocks all crawlers. **Do not work around this.** Tell the user the site has declared itself off-limits to automated crawlers; if they own it, they can lift the rule for the audit; if they don't, the audit can't be scoped this way. Offer extension-driven inspection (the user navigates themselves; each page becomes an `/aqa:analyze-page` target).
- `fetch-start-failed` — the start URL itself didn't respond. Ask the user to confirm the URL is reachable.
- `spa-shell-no-links` — the start URL is a SPA shell with no static links. Tell the user the static-HTML crawler can't sample this site; they need to author the flow interactively via `/aqa:flow` (which uses `aqa_flow_describe_page` to ground each step on the rendered DOM).
- `no-pages-selected` — the crawl ran but selection produced zero pages (all candidates were robots-disallowed, all `WebFetch` calls failed, or fingerprinting collapsed everything to one already-rejected group). Surface `stats.fetchFailures` + `notes.robotsBlocked` so the user can see what happened, then suggest either loosening the caps or starting from a different URL.
- `flow-save-failed` — the crawl produced a valid shortlist but `aqa_flow_save` itself returned an error (filesystem permissions, malformed slug after sanitization, or the `.aqa/flows/` directory unwritable). Surface `notes.flowSaveError` verbatim and suggest the user check `.aqa/` permissions; the shortlist is still in the verdict's `pages` array, so they can hand-author the flow file if needed.
- `tools-unavailable` (an `outcome`, not a `reason`) — the subagent spawned without its MCP tools: a host wiring lapse, not a crawl result, and no flow file was written. Don't crawl inline with `WebFetch` in its place; tell the user to run `/reload-plugins` (or start a fresh session) and re-invoke.

### Direct tool access

`WebFetch` is *not* something to call directly for this question shape — the agent's structured output is what makes the shortlist consumable by downstream commands. If the user wants ad-hoc one-off page reads (*"what does this URL's robots.txt say"*, *"what links does this page have"*), invoke `WebFetch` inline with a one-shot prompt and answer the user directly; don't pretend that's a crawl.
