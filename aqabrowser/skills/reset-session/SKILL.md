---
name: reset-session
description: Tear down the active AQA inspection session so the next start mints a fresh token
metadata:
  user-summary: "Stop the current session and discard its state without saving anything."
---

Invoke the `aqa_reset_session` MCP tool. It stops the network recorder, drops the persisted session token, and clears in-memory feature state for the session's bound tab. The tab binding itself survives the reset — the next `aqa_start_session` starts on the same tab.

This ends the session WITHOUT saving. If the user wants to keep the session for later (save as new / update the saved session it resumed from), use `/aqa:end-session` (the `aqa_end_session` tool) instead.

Report back in one short line whether the reset succeeded (`ok: true`) or the error the extension returned.
