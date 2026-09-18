---
name: audit-site
description: Run a site-wide AQA audit, optionally reviewing manual notes, and finish each selected page before moving to the next. Export per-page reports and one audit.html summary.
argument-hint: "<startUrl>"
metadata:
  user-summary: "Audit selected site pages, review manual notes when requested, and save per-page outcomes plus an audit summary."
---

Use for a site audit. For one page use analyze-page; for an existing stateful flow
use flow. Preserve the user's requested manual-review scope: a request to audit
and decide whether manual notes are reviewed ok or need fixing includes both jobs.

## Select the pages

Extract the starting URL; ask only if it is missing. Run crawl-site to select
representative pages and save its flow. Keep the returned flow name and page
labels. Use the user's caps, or the crawl defaults. An explicit audit request
already authorizes that bounded crawl and analysis; show the shortlist and output
directory without asking for another confirmation. Ask if the discovered scope
exceeds the user's constraints or requires an action not yet authorized.

If the user provided a saved flow, load it instead of crawling again. On an
inconclusive crawl, report the actual reason and retain the available plan;
do not fabricate a shortlist or silently switch origins. Stateful navigation,
login or cross-origin work requires the matching flow and authorized scope.

## Finish one page at a time

The execution unit is a **page**, including its requested manual review:

1. Navigate to the selected page and analyze it using the requested or saved config.
2. When manual review is requested, follow
   [review-manual-notes](../review-manual-notes/SKILL.md) on this page now. List
   its review groups from the cache, obtain required evidence, decide each
   applicable note, save definite verdicts and reconcile receipts. Inventory only
   the current page; do not collect all pages' manual notes for a later review pass.
3. Export the page's HTML after its decisions are saved. Pass
   `includeManualReview: true` only when the user requested manual notes or their
   review. Otherwise omit the flag (default
   false) and keep the original needs-fix-only report. Use the resulting counts
   for its outcome. Explicitly record checks that remain
   unresolved and status saves that failed or have unknown outcomes.
4. Save the page outcome/checkpoint, then move to the next planned page. Keep
   report paths, counts, compact rule totals and exceptions in working context;
   leave detailed evidence and methodologies in page artifacts.

If a check is blocked, record its missing evidence/reason and leave it unresolved.
Do not wait indefinitely or manufacture a pass to finish a page. An unknown save
must be reconciled where possible before leaving the page; if it remains blocked,
record it explicitly in that page's partial outcome. On navigation or analysis
failure, record the error and continue to the next page without inspecting the
wrong document.

One owner controls the live browser and all status writes. Evidence-only reviewers
may receive a group's methodology and note rows, but must not mutate or navigate that tab.
Use the current paired session for a combined audit and manual review. Do not send
that combined request to the scans-only aqa-audit-runner and review notes afterward.
For a scans-only audit, the existing aqa-audit-runner can execute this scan/export
loop using `{ flowName, outDir }`. If a delegated runner lacks tools but the current
session has them, continue from the saved plan in the working session.

Complete issue enumeration by following aqa_query_issues `nextOffset` until null
with unchanged filters, before mutating statuses. Do not infer totals from the
first 200 rows. After review, refresh counts and needs-fix rule totals from current
AQA state so newly confirmed or dismissed notes are reflected.

## Save and present the outcome

Use aqa_audit_save to write `<outDir>/audit.html`, with each page's URL, label,
reportPath, stats and errors, plus aggregate scan counts and top rules. Record
manual reviewed/saved, unresolved and failed/unknown counts separately in page
records and the summary; the saved page HTML and the status receipts hold the details.
A local checkpoint must distinguish proposed verdicts from confirmed AQA saves.

Lead with the actual scope and completion state, link audit.html, then give the
main findings and unresolved work. All scans finishing does not mean manual review
finished. A partial review remains partial even if every page produced a report.
Do not repeat raw methodology text or dump the run JSON into the answer.
