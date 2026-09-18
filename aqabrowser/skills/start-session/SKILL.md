---
name: start-session
description: Start an AQA QA inspection session and bind this session to the tab it starts on
argument-hint: "[url]"
metadata:
  user-summary: "Start inspecting a tab (the current one, a specific one, or a new one opened at a URL); later requests target that tab."
---

Start a new AQA inspection session by invoking the `aqa_start_session` MCP tool. The call **binds** this session to the tab it starts on: every later `aqa_*` call targets that tab automatically, no matter which tab the user focuses afterwards.

Pick the arguments from the user's words:

- No target mentioned → call with no arguments. The extension reuses the already-bound tab; when unbound it adopts a live or hibernating session (e.g. one the user started via the AQA panel) and only falls back to the focused tab when there's nothing to adopt.
- A URL → pass it as `url`. The extension opens a NEW tab there and the session binds to it.
- A specific existing tab ("the pricing tab", "the other tab") → call `aqa_list_tabs` to find its `tabId`, then pass `tabId` (add `url` too to navigate that tab first).

Report back in one short line whether the session started (`ok: true` in the tool result) and which tab it's bound to (`boundTabId`), or the error the extension returned. On `tab-not-found` (the target tab was closed), call `aqa_list_tabs` and re-target.

On ANY failed start, relay the result's `hint` as concrete options rather than dead-ending on the error: the user can always start on a brand-new tab (`aqa_start_session` with `url` — ask which page to open), or target a different existing tab (`aqa_list_tabs` + `tabId`). This matters most when the only open tab is already bound to another Claude session.
