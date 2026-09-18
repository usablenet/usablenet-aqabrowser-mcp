---
name: verify-image-alt
description: Verify whether an `<img>` element's `alt` text actually describes what the image depicts (WCAG 1.1.1 Non-text Content)
argument-hint: "[issueId]"
metadata:
  user-summary: "Check whether an image's alt text really describes what the image shows (WCAG 1.1.1)."
---

The user is asking whether a specific AQA-flagged `<img>`'s `alt` text is *meaningful* — i.e. does it describe what the image actually shows, is it too generic ("image", "photo", a filename), does it restate adjacent caption text (should be `alt=""`), does it describe the picture when the image is wrapped in a link/button (should describe the action instead), is the image decorative (should be `alt=""`) or informative (must describe). The DOM `alt` attribute tells you what the alt *says* and the `src` URL tells you what it *points to*; neither tells you what the image actually *depicts*. The pixels do.

They'll either paste an issue id and ask "is this alt meaningful", or you'll arrive here from `/aqa:get-issue` because a `check manually` note on a `tagName === 'IMG'` element referenced **alt-text meaningfulness** in the methodology (keywords: `meaningful`, `describe`, `alternative text`, `alt`, `decorative`, `informative`, `redundant`). This command is the right entry point for that question shape.

**Scope.** This command answers *does the alt do its WCAG 1.1.1 job for an `<img>`*. It does NOT answer:

- *Is the element actually visible to a user* (covered by overlay / off-viewport / not painted) → use `/aqa:verify-visibility`, the verdict shape there is element-compositing, not alt-meaningfulness.
- *What is the visible label / text / focus indicator* (WCAG 2.5.3 Label in Name family) → call `aqa_capture_element_view` directly from `/aqa:get-issue` and transcribe.
- *The `<img>` is missing the `alt` attribute entirely* → that's a `needs fix` with an obvious resolution (add `alt="<description>"` or `alt=""`); the vision-grounded judgement adds nothing.
- *Inline `<svg>` / CSS `background-image` / `<canvas>` / video poster* → no cached image bytes path. The agent will return `inconclusive` with the appropriate tag.

The right entry point for the alt-meaningfulness question is the **`aqa-verify-image-alt` subagent**, not a direct chain of tool calls. The agent runs the structured reconcile-the-signals workflow (issue prose + DOM alt + role rollup + pixels) so the verdict comes back as one block (`outcome`, `steps`, `detail`, `confidence`, `reason`, `signals`) instead of a long unstructured analysis.

Step 1 — pull the issue id from the user's message. Don't paraphrase it; pass exactly what the user typed. If the user invoked the command with no id (e.g. just `/aqa:verify-image-alt` with no argument and no id in the surrounding turn), ask them which issue id they want verified before going further — don't guess from the cached analysis, don't run the subagent on "the most recent IMG issue", and don't fall through to a generic alt-text explainer. One short clarifying question, then resume at Step 2 once they answer.

Step 2 — **before invoking the subagent, ask the user to confirm**. Alt-meaningfulness verification ships the image bytes to the model as a vision content block — not free, and the user may have already decided how they want the note handled. Phrasing template:

> "I can verify the alt for `<issueId>` by pulling the cached image bytes from the recorder and reconciling them with the DOM alt + role inference. OK to run the check?"

If the user confirms, invoke the `aqa-verify-image-alt` subagent with `{ issueId: "<id>" }`.

If the user declines, or doesn't respond clearly, **do NOT call `aqa_get_image_bytes`**. Fall back to answering the alt-quality question from `aqa_get_issue` + `aqa_get_element_info` + `aqa_get_element_context` alone — quote the live `alt` value, name the `inferredRole` from the context tool, note that without the pixels you can only check whether the alt is *non-empty* + *coherent with the inferred role*, not whether it *accurately describes the image*. The user can re-invoke this slash command later to get the vision-grounded answer. *"I do"* / *"I will"* / *"let me"* in response to your prompt mean the *user* will run it — same rule as commits; don't take that as authorization to invoke the vision call.

Step 3 — once the subagent returns, present its verdict to the user. **Lead with AQA's outcome, reached by the methodology traversal — not the fine-grained label.**

- `outcome` — the **headline**: `needs-fix` / `reviewed-ok` / `inconclusive`. Frame it as AQA's own methodology result: *"Per the AQA methodology: needs fix."* (When `methodologyApplied: false`, frame it as your reasoned recommendation and say AQA shipped no methodology for this rule.)
- `steps` — render the traversal: walk each step in order, showing the `question`, the `answer`, what it was `groundedOn`, and where it `routesTo`. This is what proves the methodology was followed rather than guessed — show it, don't summarise it away.
- `detail` — the supporting fine-grained classification (`alt-accurate`, `alt-vague`, `alt-mismatched`, `alt-redundant-with-context`, `decorative-ok`, `decorative-but-described`, `informative-but-suppressed`, `functional-action-named`, `functional-action-unnamed`, `none`). Present it as the *why* under the outcome, not as the verdict itself.
- `confidence` — `high` / `medium` / `low`
- `reason` — the grounded explanation; quote it as-is
- `signals` — show `alt`, `inferredRole`, `imageDescribesAs`, and any of (`siblingText`, `inferredRoleReason`) the reason cites. Skip the rest when it's not load-bearing.

When `outcome === 'tools-unavailable'`, the subagent spawned without its MCP tools — a host wiring lapse, not a verdict. Don't pull the image bytes inline in its place; tell the user to run `/reload-plugins` (or start a fresh session) and re-invoke.

When `outcome === 'inconclusive'`, name the specific signal that's missing or noisy (or the methodology step that couldn't be grounded) and offer one concrete follow-up:

- `resource-not-cached` — the image wasn't fetched while the AQA session was recording. The user can re-run analysis after a hard refresh so the recorder picks up the bytes this time. **Do not** suggest fetching the URL out-of-band; the resource may not even be available.
- `image-not-loaded` — the image errored or is still loading. Suggest the user check the network panel for that URL.
- `image-source-empty` — the `<img>` has no usable `src` / `currentSrc`, so there is nothing to look up. If the page has since loaded the image, suggest a re-analyze.
- `inline-svg-not-supported` / `data-uri-not-supported` — out of scope for v1; this agent only handles HTML `<img>` with a cacheable network resource.
- `not-an-image-element` — the issue's selector resolved to something that isn't an `<img>`. The cached analysis may be stale; suggest a re-analyze.
- `selector-not-found` — the page navigated since the cached analysis; suggest a re-analyze.

**Apply the `'check manually'` phrasing rule.** Most alt-meaningfulness verifications come from `'check manually'` notes. Frame the verdict accordingly — *"the image bytes show a Q3 revenue bar chart; the alt says 'team photo' — clear mismatch"* is fine; *"AQA found that the alt is wrong"* is not — the verdict is yours, grounded on the pixels + role inference, not AQA's. The reviewer still owns the final status change in the panel.

**Suggesting a fix.** When the outcome is `needs-fix`, the `detail` points to a fix shape. Two hard boundaries first:

- **The fix only ever changes the text alternative / semantics — `alt`, `role`, `aria-*`. Never suggest changing the image file, `src`, or content.** What the image *is* is a content/design decision outside accessibility. If the image looks wrong for its context (a placeholder, a stock photo unrelated to the product), that's a content bug — out of scope; don't present it as the remediation and don't volunteer it. The a11y-correct move for a wrong/irrelevant image is `alt=""`, not "swap the picture."
- **Any alt you propose must describe what the image actually shows — never content the pixels don't contain.** Proposing `alt="Wireless headphones"` for an image of waves just trades one 1.1.1 defect for another (now the AT text and the visual diverge). If the only honest alt would be useless in context ("sea waves" in a headphones card), the answer is `alt=""`, not an aspirational alt.

- `alt-vague` → propose a new alt grounded on `signals.imageDescribesAs`. Lead with *"based on what the image depicts, a meaningful alt would be `<…>`"*. Only when the image genuinely conveys product/content information a sighted user gets from it.
- `alt-mismatched` → the alt names something absent from the image. Either correct the alt to honestly describe the pixels (if the image is meant to be informative), or — far more often — set `alt=""` because the surrounding text already carries the meaning. Default to `alt=""` and say why; don't invent an alt for the subject the author *wished* the image showed.
- `alt-redundant-with-context` → propose `alt=""`. Quote the adjacent text (or note the image is an irrelevant/placeholder picture) that makes the image add-nothing. Frame it as: the surrounding content already conveys this, and if the author intended the image as decoration, `alt=""` is how that's declared.
- `decorative-but-described` → propose `alt=""` and name the decorative signal (`role="presentation"` / `aria-hidden="true"` / inferred from context).
- `informative-but-suppressed` → propose removing the suppression (`alt=""` → meaningful alt, drop `role="presentation"` / `aria-hidden`) and ground the new alt on the pixels.
- `functional-action-unnamed` → propose naming the action via either the alt (e.g. `alt="View cart"`) or the wrapper (e.g. add visible link text).

For any fix proposal, point the user at `/aqa:get-issue` if they want the AQA-authored `remediation.solutions` for the rule — that's the canonical fix wording. This command's job is the verdict, not the fix authoring.

**Direct tool access.** `aqa_get_image_bytes` and `aqa_get_element_context` are also callable directly (without the subagent) for ad-hoc reads — "show me the image bytes for this issue", "is this image marked decorative". Use them when the user wants *the data*, not a *judgement*. The vision content block from `aqa_get_image_bytes` lets you describe the image; the rollup from `aqa_get_element_context` lets you reason about the role without running the full reconcile.
