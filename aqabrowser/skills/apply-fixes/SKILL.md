---
name: apply-fixes
description: Inject AQA "Suggested AI fix" diff blocks into an HTML report from a `fixes.json` sidecar
metadata:
  user-summary: "Embed proposed code fixes into an exported HTML report as before/after diffs, one per issue."
---

The fixes object is **never** passed inline as a tool argument — it would balloon the MCP permission prompt with all the before/after code. Instead, write a sidecar JSON file alongside the report, then call the tool with two paths.

Step 1 — write the fixes file. Path convention: `<reportDir>/fixes-<sameTimestampAsReport>.json`. Shape:

```json
{
  "AI0": { "file": "src/components/Header.jsx", "line": 29, "before": "old code", "after": "new code" },
  "AI3": { "file": "src/App.css", "line": 233, "before": "color: #c0c0c0;", "after": "color: #767676;" }
}
```

Keys are **issueIds** — the same string each report card carries as `data-issue-id`, and the same key used in the `placeholders` sidecar that `aqa_export_report` writes next to the report. Each entry: `file` (path relative to the project root), `line` (1-indexed line where the fix lands), `before` (the existing code chunk), `after` (the replacement).

**Every entry's `after` must be derived from one of the AQA-provided `remediation.solutions` for that issue.** The remediations are already pre-resolved in the `aqa_export_report` sidecar JSON at `placeholdersPath` — Read that file once and you have every needs-fix issue's `problem` + numbered `solutions` keyed by `issueId`. Do **not** call `aqa_get_issue` per issue; do **not** call `aqa_query_issues` to enumerate ids. AQA keeps those solutions current with WCAG. Don't paraphrase a solution into something different, and don't invent a fix from training data — if no AQA solution fits the codebase, omit that issue from `fixes.json` (its card renders untouched in the report) and surface the gap to the user.

Step 2 — invoke the `aqa_apply_fixes` MCP tool with `{ reportPath, fixesPath }`. It reads the file, finds each card by its `data-issue-id` attribute, prepends the styled before/after diff block to the card's body, and writes the report in place. Cards without a matching entry in `fixes.json` are left untouched.

The tool does NOT modify source files. If the user asked you to also apply the fixes, do that with your file-edit tools after this call returns — only edit what the AQA solution prescribes.

When the tool returns, report:
- how many cards received a diff block (`replaced`)
- any issueIds in `missing` (no card with that `data-issue-id` was in the report — usually means the report was generated without that issue, the issue was filtered out, or the report is from a different run)

**Do NOT write or execute scripts (Python, Bash, Node, awk/sed, etc.) for any part of this flow.** No HTML parsing to enumerate issueIds (the sidecar JSON has them), no `fixes.json` assembly via `echo`/`jq`/`cat <<EOF`. Your file read/search/edit tools plus the MCP tools cover every step. Reach for a shell only for a one-off `git`/`ls` sanity check — never to author or transform content.
