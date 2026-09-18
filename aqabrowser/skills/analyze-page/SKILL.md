---
name: analyze-page
description: Run an AQA accessibility evaluation on the active session and summarize the digest
metadata:
  user-summary: "Run AQA on the page you are working on and get the totals by status and severity plus the rules with the most issues."
---

Invoke the `aqa_analyze_page` MCP tool. It hits the AQA dev `/evaluate` endpoint for the active session and returns a **brief summary** (the full per-issue data stays on the extension side):

- `analysis` — `{ value: 'fresh' | 'stale' | 'none', running: boolean }` snapshot of the cache state.
- `summary` — `totalNotes`, plus `byStatus` (`needsFix` / `manually` / `dismissed`) and `bySeverity` (`high` / `medium` / `low`) counts.
- `rulesNeedingFix` — `{ total, top: [{ ruleId, ruleTitle, title, total }] }` — top 5 rules by issue count, no selectors.
- `drilldown` — pointer text telling you which tool to call next.

If the user's message specifies team / ruleset pack / ruleset, pass them through as tool arguments to override the panel defaults.

Lead with a one-sentence summary (totals, top severity counts), then surface the dominant rules from `rulesNeedingFix.top`. **Don't request the full digest and don't run an extra summarization pass — the brief shape already fits.** If `ok: false`, report the error.

**For follow-up questions about specific issues:**
- "Which issues for rule X / WCAG 1.4.3 / severity high?" → `aqa_query_issues` (filter args, returns lightweight per-issue rows + facets across the full match set).
- "How do I fix issue <id>?" → `aqa_get_issue` with that `issueId` (returns the AQA remediation: `problem` + numbered `solutions`, plus a11y context and live outerHTML).
- "Let's fix all of these" / "Generate the report with fixes" → `aqa_export_report` (writes the HTML + a placeholders sidecar JSON with every needs-fix issue's id + remediation already resolved — feeds the apply-fixes flow without N round-trips through `aqa_get_issue`).

Ground every fix recommendation on the AQA `remediation.solutions`, and keep each fix **strictly scoped to that issue's `ruleTitle`** — the specific WCAG criterion AQA flagged the issue under. Don't slip in advice about other WCAG criteria, even if the same element looks problematic for unrelated reasons; if those matter, they're separate issues the user can pull via `aqa_query_issues`. AQA maintains those solutions against the latest WCAG; do not fall back to general training data. If a solution is missing or none fits the codebase, say so — don't invent a fix.

Call `/aqa:start-session` first when this session isn't bound to a tab yet (the call fails with `no-session-tab`). With no args it adopts a session the user already started via the AQA panel and binds to its tab; if that panel session lives on a different tab than the adopted one, find it with `aqa_list_tabs` and pass its `tabId`.

On a `session-expired` / `no-session` failure (server-side session died — MCP server restart, token expiry, tab teardown), relay the result's `hint` and run the recovery instead of dead-ending: `aqa_reset_session` → `aqa_start_session` (re-binds + fresh token) → re-run the analysis.
