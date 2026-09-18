---
name: last-analysis
description: Read the most recent cached AQA evaluation for the bound tab without re-running it
metadata:
  user-summary: "Show the results of the most recent analysis of the current tab without running it again."
---

Invoke the `aqa_last_analysis` MCP tool. It reads the cached `/evaluate` response for the session's bound tab (pass `tabId` to read a different tab one-off) and returns the same **brief summary** as `aqa_analyze_page`. The cache is populated automatically on every successful evaluation, regardless of whether it was triggered from the panel UI or from `aqa_analyze_page` — so this works for tests the user ran themselves.

Lead with a one-sentence summary (totals, top severity counts), then surface the dominant rules from `rulesNeedingFix.top`. **Don't dump the response — the brief shape already fits, no extra summarization pass needed.** For per-issue questions, use `aqa_query_issues` (filter + facets) or `aqa_get_issue` (one issue's remediation). Mention `analysis.value === 'stale'` if present — selectors may not resolve and the user should consider re-running.

If `error` is `'no-cached-analysis'`, tell the user no analysis is cached for the bound tab and offer to run `aqa_analyze_page`. If the call fails with `no-session-tab`, the session isn't bound to a tab yet — a panel-driven run is reached by binding to its tab first: `aqa_start_session` (adopts it), or `aqa_list_tabs` + `aqa_bind_tab`.
