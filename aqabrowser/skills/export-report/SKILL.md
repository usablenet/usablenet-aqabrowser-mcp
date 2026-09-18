---
name: export-report
description: Export a self-contained AQA HTML accessibility report (screenshot + highlighted issues + per-issue fix placeholders)
metadata:
  user-summary: "Export a self-contained HTML report: annotated screenshot, heatmap, and one card per issue with AQA's remediation."
---

Invoke the `aqa_export_report` MCP tool. It generates a self-contained HTML accessibility report: full-page screenshot with an SVG overlay highlighting every "needs fix" element by severity, counts/breakdown tables, severity × complexity matrix, full-page heatmap, and per-issue collapsible blocks. Every issue card carries a `data-issue-id="<id>"` attribute that `aqa_apply_fixes` anchors on to inject the styled diff block.

Behavior:
- Default output is the original needs-fix-only report. Set `includeManualReview: true` only when the user explicitly requests manual notes or their review. This adds check-manually/reviewed-ok sections and review activity to the HTML. Cached manual/reviewed-ok notes alone do not enable it. This flag exports existing state; it does not review notes or change their status.
- By default, uses the cached `/evaluate` response for the session's bound tab (the tab is resolved once and used for every step of the export, so screenshot and counts can't split across tabs). If nothing is cached, the tool errors with a clear message — call `/aqa:analyze-page` first, or pass `force: true` to re-run automatically.
- `outDir` defaults to `./reports`, resolved against the workspace root (the MCP client's first root; on hosts that negotiate no roots the server falls back to its anchor directory, so pass an absolute path there).
- Returns the absolute path of the generated HTML.

Filtered exports:
- If the user asks for a report scoped to a subset, pass the same filter fields you'd give `aqa_query_issues` — `status`, `severity`, `complexity`, `responsibility`, `technology`, `ruleId`, `tagName`, `auto`, `search`. Filters are AND-combined.
- Map the user's natural-language reference the same way as `aqa_query_issues`:

  | User says... | Pass... |
  | --- | --- |
  | "high severity", "critical" | `severity: "high"` |
  | "easy fixes", "low-hanging fruit" | `complexity: "easy"` |
  | "needs fix", "automatic" | `status: "needsFix"` (and/or `auto: true`) |
  | "only check manually" | `status: "checkManually", includeManualReview: true` |
  | "only reviewed ok" | `status: "reviewedOk", includeManualReview: true` |
  | "developer's queue", "design issues", "content issues" | `responsibility: "development"` (or design/content) |
  | "CSS issues", "HTML", "ARIA" | `technology: "css"` (or html/aria) |
  | "image issues", "links" | `tagName: "IMG"` (or `"A"` — uppercase) |
  | "WCAG 1.4.3", "1.3.1" | `search: "1.4.3"` — substring across rule/title/remediation text |
  | "contrast issues", "alt text", "aria-label" | `search: "contrast"` (or "alt", or whatever keyword) |

- Prefer a structured field over `search` when both could apply; `search` is the fallback for keywords/concepts the structured fields don't cover.
- When any filter is provided, the report's cards, counts, breakdowns, exposure pill, and heatmap all reflect the filtered subset; the filename gets a `-filtered` suffix; the returned stats include `totalNotesBeforeFilter` and the resolved `filtersApplied` object.
- **Never** call `aqa_query_issues` first to pre-filter and then `aqa_export_report` — the filter fields go directly on `aqa_export_report`.

When the tool returns, report:
- the file path (so the user can open it)
- the counts: total notes, needs-fix, selectors resolved / requested

The response also returns a `placeholdersPath` — a sidecar JSON file the tool writes next to the report, shaped `{ reportPath, placeholders: [{ issueId, ruleId, ruleTitle, title, status, severity, complexity, responsibility, technology, tagName, selector, remediation }, ...] }` (entries in render order — needs-fix cards sorted by severity; `issueId` is the apply-fixes anchor, matching each card's `data-issue-id`). Each entry carries the issue's id, key facets, and the AQA `remediation` (`problem` + numbered `solutions`). Treat this file as the source of truth for the apply-fixes flow — **never** open the HTML to discover issue ids, and **never** call `aqa_get_issue` per issue.

If the user wants code-fix suggestions, follow this flow **exactly** — every step has a dedicated tool, there is no need to write or run a script:

1. **Read** the sidecar JSON at `placeholdersPath` (one file read returns every needs-fix entry's `issueId` + `remediation`). No HTML scan, no per-issue `aqa_get_issue` round-trips.
2. Locate the relevant source files with your file-search tools and read them.
3. **Generate each fix from one of the issue's `remediation.solutions` only.** AQA's remediation is kept current with WCAG by the AQA team — your training data may be stale. Pick the simplest applicable solution. If none of an issue's solutions fits the codebase, leave that issue out of `fixes.json` (its card renders untouched in the report) and surface the gap to the user — don't invent a fix.
4. Write `<reportDir>/fixes-<sameTimestampAsReport>.json` — one JSON object keyed by **issueId** (the `issueId` field on each placeholder entry, e.g. `"AI0"`, `"AI1"`), each entry `{ file, line, before, after }`. Don't pass the fixes inline as a tool argument; the file-based handoff is what `aqa_apply_fixes` expects.
5. Call the **`aqa_apply_fixes`** MCP tool with `{ reportPath, fixesPath }` — both string paths — to inject the diff blocks into the HTML report. The tool anchors on each card's `data-issue-id` attribute.
6. If the user asked you to also apply the fixes, edit the source files directly with your file-edit tools — `aqa_apply_fixes` does NOT touch source code. Only edit what the AQA solution prescribes; preserve existing style.

`aqa_get_issue` is reserved for stand-alone single-issue questions ("what's AM0 about?") and for `check manually` items whose methodology recipe doesn't ride along in the export. The apply-fixes flow above doesn't need it.

**Do NOT write or execute scripts (Python, Bash, Node, awk/sed, etc.) for any part of this flow.** No HTML parsing to extract placeholders, no source-file rewriting via a script, no `fixes.json` assembly via `echo`/`jq`/`cat <<EOF`. Your file read/search/edit tools plus `aqa_export_report` + `aqa_apply_fixes` cover every step (with `aqa_query_issues` / `aqa_get_issue` for the side flows above). If you find yourself reaching for a shell to do anything beyond a one-off `git`/`ls` sanity check, stop and use the dedicated tool instead.

Constraints:
- Only fix issues marked "needs fix" — never "check manually".
- Every fix's *what to change* comes from the AQA solution; only the *where to apply it* (file/line) is yours.
- Preserve existing code style and patterns.
