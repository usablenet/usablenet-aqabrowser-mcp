---
name: query-issues
description: Filter the cached AQA analysis by severity, technology, WCAG number, etc. and return only the matching issues
metadata:
  user-summary: "List the issues matching a filter: severity, status, WCAG number, element type, technology, or a keyword."
---

The user refers to issues by some category — severity, technology, responsibility, WCAG number, status, tag — and wants to talk about just that subset. Use `aqa_query_issues` to slice the cached analysis without re-running anything.

Map the user's natural-language reference to query fields:

| User says... | Pass... |
| --- | --- |
| "high severity", "critical" | `severity: "high"` |
| "easy fixes", "low-hanging fruit" | `complexity: "easy"` |
| "needs fix", "automatic", "auto-detected" | `status: "needsFix"` (and/or `auto: true`) |
| "check manually", "manual review", "for me to verify" | `status: "checkManually"` (often `auto: false`) |
| "developer's queue", "design issues", "content issues" | `responsibility: "development"` (or design/content) |
| "CSS issues", "HTML", "ARIA" | `technology: "css"` (or html/aria/etc.) |
| "image issues", "links" | `tagName: "IMG"` (or `"A"`, etc. — uppercase) |
| "WCAG 1.4.3", "1.3.1", "WCAG 2.5.x" | `search: "1.4.3"` — substring across rule titles + problem text |
| "color contrast", "alt text", "aria-label" | `search: "contrast"` (or "alt", or whatever keyword) |

Combine filters when the user combines criteria (e.g. "high-severity image issues" → `severity: "high"`, `tagName: "IMG"`). When in doubt about which dimension a word maps to, prefer a structured field over `search` — it's more precise.

Result shape:
- `total` — how many issues matched (pre-limit). If huge and the user asked for a summary, lead with the totals + the `facets` distribution rather than dumping every match.
- `returned` — how many issues are in `issues[]`. Capped at `limit` (default 50, max 200).
- `issues[]` — each entry has `id`, `ruleId`, `ruleTitle`, `title`, `status`, `severity`, `complexity`, `tagName`, `selector`, `responsibility`, `technology`, `auto`, and (by default) `remediation` with AQA's `problem` + `solutions`.
- `facets` — counts across the full match set: `byStatus`, `bySeverity`, `byComplexity`, `byTechnology`, `byResponsibility`, `byRule` (top 20), `byTagName` (top 20). Useful to suggest a tighter follow-up.

Reporting back to the user:
- For "show me X" — list the matching issues with id, rule, severity, selector. Don't dump remediation unless they asked.
- For "fix all the X" — for each issue, generate a fix grounded **only** on its `remediation.solutions` (AQA-authored, current with WCAG) and **strictly scoped to that issue's `ruleTitle`** — don't slip in advice about other WCAG criteria, even if the same element looks problematic for unrelated reasons. If a solution doesn't fit the codebase, say so and skip — never invent a fix from training data. Prefer the `/aqa:export-report` + `/aqa:apply-fixes` flow when the count is meaningful.
- For "summarize" — surface the totals + facets, then highlight one or two top rules.

If `ok: false` with `error: "no-cached-analysis"`, tell the user nothing's cached for the bound tab and offer `/aqa:analyze-page`.

For complete enumeration, follow `nextOffset` as `offset` with unchanged filters until it is null. Finish enumeration before changing statuses, since offset pagination reads the current cache. For bulk manual review prefer `aqa_review_groups` + `aqa_review_group` (same cache, grouped by rule + AQA question, methodology once per group) and the review-manual-notes skill.
