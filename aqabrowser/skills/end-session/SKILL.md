---
name: end-session
description: End the active AQA inspection session, optionally saving it server-side first (as a new saved session, or updating the one it resumed from)
metadata:
  user-summary: "End the current session, optionally saving it in AQA so you can resume it later from the panel."
---

Invoke the `aqa_end_session` MCP tool. It targets the session's bound tab (pass `tabId` for a different one), optionally persists the live session server-side — so it can be resumed later from the panel's saved-sessions picker — and then runs the same teardown as `aqa_reset_session`. The tab binding survives the end: a follow-up `aqa_start_session` restarts on the same tab.

Pick `save` from the user's words:

- End without saving ("end the session", "close the session") → `save: "none"`.
- Save as a new saved session ("save it as X", "keep this as a new session") → `save: "new"` with `name`. If the user didn't give a name, ask for one before calling — the name is what they'll see in the panel's saved-sessions picker.
- Update the saved session this tab was resumed from ("save my changes", "update the saved session") → `save: "update"`. No `name` here.
- "End and save" with no new-vs-update preference → try `save: "update"` first (the panel's default when a saved session is selected); if it fails with `no-selected-session`, fall back to `save: "new"` (ask for a name if you don't have one).

The save runs first and gates the teardown:

- `ok: false, saved: false` — the save failed and the session is still fully active. Report the error and let the user retry or end without saving.
- `ok: false, saved: true` — the snapshot was stored but the teardown failed. Finish with `aqa_reset_session`.
- `ok: true` — the session ended; when a save ran, `savedSession` echoes the stored row's `id` + `name`.
- `no-session-tab` — this session isn't bound to a tab; bind first (`aqa_start_session`, or `aqa_list_tabs` + `aqa_bind_tab`).
- `tab-not-found` — the bound tab was closed; call `aqa_list_tabs` and re-target.

Report back in one short line: whether the session ended, and — when saved — the saved session's name from `savedSession`.
