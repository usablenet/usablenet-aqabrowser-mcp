---
name: verify-visibility
description: Verify whether an AQA-flagged element is actually visible to a human user on the rendered page (not just CSS-visible)
argument-hint: "[issueId]"
metadata:
  user-summary: "Check whether a flagged element is really visible on screen, not hidden behind a banner or off the page."
---

The user is asking whether a specific AQA-flagged element is *actually* visible to a human user — i.e. covered by a sticky banner, drawn off-viewport, painted in a color that matches its surrounding background (white-on-white text), rendered at zero composited area, or hidden under a full-screen modal. CSS-style visibility (`display`, `visibility`, `opacity`, `getBoundingClientRect`) cannot detect any of those; the pixels can.

They'll either paste an issue id and ask "is this actually visible", or you'll arrive here from `/aqa:get-issue` because a `check manually` note's `methodology` referenced **element-visibility** (i.e. "is the element seen / covered / off-viewport / drawn"). This command is the right entry point for that question shape.

**Scope.** This command answers *is the element composited and perceivable* — a yes/no verdict about the element itself. It does NOT answer:

- *what is the visible label / text / name / focus indicator* (the "label in name" family of `check manually` questions, where the question is about rendered *content*, not element compositing). Those are also pixel-grounded, but the right path is a direct `aqa_capture_element_view` call from `/aqa:get-issue` — the subagent below assumes the element-visibility verdict shape and would force-fit the wrong answer. See the read-rendered-content branch in `/aqa:get-issue`'s Step 1c.
- *does this `<img>`'s alt text actually describe what the image depicts* (WCAG 1.1.1 Non-text Content, `check manually` family). That's an image-content question grounded on the cached image bytes, not a viewport screenshot — use `/aqa:verify-image-alt` (the `aqa-verify-image-alt` subagent reconciles the DOM alt + role inference + `aqa_get_image_bytes`). See the image-alt-meaningfulness branch in `/aqa:get-issue`'s Step 1c.

The right entry point for the element-visibility question is the **`aqa-verify-visibility` subagent**, not a direct chain of tool calls. The agent runs the structured reconcile-the-signals workflow (cached a11y + post-scroll rect + pixels) so the verdict comes back as one block (`outcome`, `steps`, `detail`, `confidence`, `reason`, `signals`) instead of a long unstructured analysis.

Step 1 — pull the issue id from the user's message. Don't paraphrase it; pass exactly what the user typed. If the user invoked the command with no id (e.g. just `/aqa:verify-visibility` with no argument and no id in the surrounding turn), ask them which issue id they want verified before going further — don't guess from the cached analysis, don't run the subagent on "the most recent issue", and don't fall through to a generic visibility explainer. One short clarifying question, then resume at Step 2 once they answer.

Step 2 — **before invoking the subagent, ask the user to confirm**. Visibility verification fires a viewport screenshot per call — not free, and the user may have already decided how they want the note handled. Phrasing template:

> "I can verify visibility for `<issueId>` by taking a viewport screenshot of the element and reconciling it with AQA's cached a11y signals. OK to run the check?"

If the user confirms, invoke the `aqa-verify-visibility` subagent with `{ issueId: "<id>" }`.

If the user declines, or doesn't respond clearly, **do NOT call `aqa_capture_element_view`**. Fall back to answering the visibility question from `aqa_get_issue` + `aqa_get_element_info` alone — quote `a11y.visibility` and `a11y.contrastRatio`, note that those are CSS-style signals and won't catch overlay coverage, and stop. The user can re-invoke this slash command later to get the pixel-grounded answer.

Step 3 — once the subagent returns, present its verdict to the user. **Lead with AQA's outcome, reached by the methodology traversal — not the fine-grained compositing label.**

- `outcome` — the **headline**: `needs-fix` / `reviewed-ok` / `inconclusive`. Frame it as AQA's own methodology result: *"Per the AQA methodology: needs fix."* (When `methodologyApplied: false`, frame it as your reasoned recommendation and say AQA shipped no methodology for this rule.)
- `steps` — render the traversal in order (each step's `question`, `answer`, what it was `groundedOn`, where it `routesTo`). This is what proves the methodology was followed, not guessed.
- `detail` — the supporting compositing classification (`actually-visible`, `covered`, `not-painted`, `unreadable-contrast`, `off-viewport`, `none`); present it as the *why* under the outcome.
- `confidence` — `high` / `medium` / `low`
- `reason` — the grounded explanation; quote it as-is
- `signals` — show the structured row (cached visibility, contrast, intersectsViewport, nonZeroSize) when it's load-bearing for the reason; skip it when everything aligns.

When `outcome === 'tools-unavailable'`, the subagent spawned without its MCP tools — a host wiring lapse, not a verdict. Don't run the screenshot reconcile inline in its place; tell the user to run `/reload-plugins` (or start a fresh session) and re-invoke.

When `outcome === 'inconclusive'`, name the specific signal that's missing or noisy (or the methodology step that couldn't be grounded) and offer one concrete follow-up (e.g. "scroll the page yourself, then re-run", "the element resolved but the screenshot decode failed — try again", "issue id didn't resolve to a tree node, so no cached a11y to reconcile against").

**Apply the `'check manually'` phrasing rule.** Most visibility-related verifications come from `'check manually'` notes. Frame the verdict accordingly — *"the pixel check shows the element is covered by the sticky cookie banner"* is fine; *"AQA found that the element is covered"* is not — the verdict is yours, grounded on the screenshot, not AQA's. The reviewer still owns the final status change in the panel.

**Direct tool access.** `aqa_capture_element_view` is also callable directly (without the subagent) for ad-hoc "show me what that element looks like" asks — no visibility verdict, just the pixels + metadata. Use it when the user wants to *see* the element, not when they want a *judgement*.
