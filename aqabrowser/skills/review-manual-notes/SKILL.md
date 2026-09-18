---
name: review-manual-notes
description: Review multiple AQA manual notes using cache-backed review groups, live evidence and batch status updates. Use when the user asks whether manual notes are reviewed ok or need fixing, including as part of a site audit.
metadata:
  user-summary: "Review manual notes with evidence, save confirmed outcomes in batches, and export the remaining checks."
---

Keep one browser owner for the audit. Complete each page's evidence collection,
review and status saving before navigating to the next page. Existing authorization
to run an audit and decide manual-note outcomes covers this workflow; don't ask
again per page or image. Respect a request for recommendations without saving.

1. List `aqa_review_groups({ status: "checkManually", tabId })` after analysis. It
   reads the cached evaluation and returns compact rows — group id, rule, AQA
   question, note count, status breakdown — plus the stored `analysisId` and the
   analysis freshness. No methodology text and no notes ride along, so the call
   stays small even on pages with hundreds of manual notes. Group ids are stable
   for one analysis run regardless of the status filter. Never guess note IDs.
2. For each group you review, call `aqa_review_group({ groupId, status:
   "checkManually", tabId })`. It returns the methodology and remediation once, then
   the group's notes (id, selector, tag, cached a11y context, status, activities)
   paginated with `offset` / `nextOffset` (default 50, cap 200). Follow `nextOffset`
   until null before deciding the group is fully inventoried.
3. A group shares a review question, not a verdict. Read its methodology once and
   follow its actions for each note. Collect the specific evidence it requires with
   `aqa_get_element_info`, `aqa_capture_element_view`, `aqa_get_image_bytes` and
   `aqa_get_element_context` as applicable. Cached context does not establish live
   identity, rendered contrast, visibility or image meaning. If navigation or DOM
   changes break identity, obtain fresh evidence/analysis; a matching selector or
   analysisId alone is insufficient. Inspect image bytes for depiction and
   surrounding context for purpose; use rendered screenshots for compositing and
   visibility. Avoid spawning a live-browser verifier per note.
4. Reuse observations only when element identity, surrounding meaning, rendered
   state and the tested condition are equivalent. Never pass every instance of a
   rule or every matching selector automatically. If a method lacks a usable
   applicability branch, evidence is missing, or a required interaction cannot be
   tested, retain `checkManually` and record the reason and blocked step locally.
   No forced yes/no answer and no invented "not applicable" status.
5. Save definite decisions with `aqa_set_notes_status`. A batch contains at most
   50 individually assessed notes sharing the exact verdict and evidence-based
   `description`. Use separate batches when reasons differ, even for the same group.
   Pass the `analysisId` from `aqa_review_groups`, an explicit `tabId` and `outDir`.
   Run batches sequentially on that tab. The server performs bounded request
   concurrency.
6. Read every receipt: `updated` confirms server POSTs; `notFound`, `failed`,
   `cachePersisted: false`, `receiptError` and `outcome-unknown` require reconciliation.
   Never repeat a whole successful/partial batch. A pending receipt or timeout is
   an unknown outcome: inspect current note status/activity before considering a
   retry. `analysis-id-mismatch` means the stored analysis run changed; list the
   groups again and reassess against current facts.
7. Re-export `aqa_export_report({ outDir, tabId, includeManualReview: true })` after
   saving. Its HTML includes needs-fix, unresolved manual and reviewed-ok cards with
   available activity. Report counts of inspected, confirmed saved, unresolved and
   failed/unknown decisions separately. Unresolved checks mean the manual review is
   partial, even when all automatic scans finished.

For optional delegation, hand evidence-only reviewers one group's methodology and
note rows plus the captured image assets, not the live tab or an assumed paired
MCP session. They return issue IDs, terminal decisions, methodology steps and
evidence references; the browser owner validates identity and owns all status
writes. Do not delegate when the host cannot provide the required evidence or when
it adds more overhead.
