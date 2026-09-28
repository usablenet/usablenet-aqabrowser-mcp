---
name: setup-bridge
description: Show the AQA bridge pairing code, connection status, a diagnosis of why the bridge isn't connected, and the matching pairing steps — to set up or recover a stuck / unpaired bridge
metadata:
  user-summary: "Show the pairing code and connection status, with the steps to pair the extension or fix a stuck connection."
---

Invoke the `aqa_setup_bridge` MCP tool. It is answered **before** the bridge connection gate — and without the startup wait the other `aqa_*` tools take — so it works even when nothing is connected, which is exactly when it's needed (an unpaired or "stuck" bridge).

Reach for this **without** an explicit `/aqa:setup-bridge` invocation whenever:

- An AQA tool just failed with "No pairing attempt … has reached this server", "pairing code does NOT match", "disconnected from the bridge" or "extension not ready" — or you're about to call an `aqa_*` tool and the bridge has never connected this session.
- The user asks how to set up, pair, connect, or authorize the AQA extension, mentions a "pairing code" / "token", or says the bridge or plugin is "stuck".
- The user just deleted or regenerated `~/.aqa/bridge-secret` — the extension still holds the OLD code and must be re-paired with the current one.
- `aqa_setup_bridge` is the ONLY `aqa_*` tool you can see — that is the plugin's launcher standing in for the server because Node.js is missing on this machine; its answer is the install guidance.

If **no `aqa_*` tool is available at all** (not even `aqa_setup_bridge`), the MCP server did not start and this skill has nothing to call. On a host that could not run the plugin's launcher (a Windows host that does not resolve its `.cmd`) that most often means Node.js is missing: tell the user to install the LTS from https://nodejs.org/en/download (the .msi / .pkg installer needs no command line), then to fully quit and reopen the app before asking again.

Response shape:

- `{ ok: true, diagnosis, retryInSeconds?, connected, everConnected, lastClientVersion, boundTabId, tabs?, port, slot, pairingCode, secretPath, pairing, steps: [...], note }`
- `diagnosis` — `connected` | `pairing-code-mismatch` | `extension-disconnected` | `starting` | `no-pairing-attempt`, or `node-missing` | `node-too-old` from the launcher's stand-in when the server itself cannot run. The server derives it from the pairing telemetry and its own uptime, and `steps` is already tailored to it.
- `retryInSeconds` (only while `starting`) — how long until the server can tell "not probed yet" from "never paired".
- `pairing` — `{ helloAttempts, lastHelloSecondsAgo, authFailures, lastAuthFailureSecondsAgo }`: the evidence behind the diagnosis.
- `port` / `slot` — which port of the bridge range this session's server bound; other concurrent agent sessions hold their own slots.
- `tabs` (present when connected) — the open http(s) tabs: `{ tabId, url, title, active, sessionActive, sessionHibernating }` per row.

How to relay it — **lead with `diagnosis`, then relay `steps` verbatim**. Each branch names the one fix that applies; don't collapse them into a generic "paste, save, reload" recipe:

- `connected` **and** `boundTabId` names a tab in `tabs`: the bridge is paired, connected, and bound — report the bound tab by its title/url. No action needed.
- `connected` but `boundTabId` is `null` (or its tab is missing from `tabs` — it was closed): the bridge itself is fine, but no tab is bound, so `aqa_*` calls have no target. **Don't say "no action needed."** Present the `tabs` rows as a short numbered list (title — url, marking rows with a live `sessionActive` or resumable `sessionHibernating` AQA session) and ask which tab to work on. When the user picks, call `aqa_bind_tab` with that `tabId` — or `aqa_start_session` with that `tabId` when they want to start analyzing right away. These are tool calls **you** make after they answer; never present `aqa_*` tool names to the user as slash commands (`/aqa:start-session` is the only slash command in this flow).
- `pairing-code-mismatch`: the extension IS reaching this server but holds a different code. Give the **`pairingCode` verbatim** and the paste location from `steps` (**Settings → Connection → MCP bridge section**, then Save). No reload — the extension re-handshakes on its next retry.
- `extension-disconnected`: it was connected this boot and dropped (service-worker eviction). Nothing to re-pair; tell the user it reconnects within ~30s and retry the original call.
- `starting`: the server bound its port seconds ago and the extension has not probed it yet (it redials idle bridge ports every ≤30s, so the first connection can take up to ~30s). **Not a failure and nothing to reload**: say the bridge is still connecting and retry in `retryInSeconds` — bridge-backed `aqa_*` tools wait this out on their own, so the original call can simply be repeated. If the user has never paired the extension on this machine, give the `pairingCode` now so it pairs on that probe.
- `no-pairing-attempt`: nothing has reached the server in the ~30s since boot. Relay `steps` in order — wedged worker → reload the extension at `chrome://extensions`; empty code field → paste the `pairingCode` and Save; bridge toggle + port range; same-machine Chrome + compatible versions. This is the only branch where the reload step belongs.
- `node-missing` / `node-too-old`: the answer comes from the plugin's launcher standing in for the server — Node.js 20 or newer is not installed on this machine (or the app cannot see it), so NO other `aqa_*` tool exists right now and nothing about the extension or the pairing can be checked yet. Relay `steps` verbatim in plain language: the user may never have used a terminal, so the installer download comes first and the command-line routes are alternatives. `found` names a too-old Node.js when there is one. Then tell them to **fully quit and reopen the app** before asking again — the real tools appear on its next start. Don't bring up pairing codes or the extension in this branch.
- Surface `note` (and `secretPath`) only when the user mentions having deleted or regenerated the secret file.
- Don't paraphrase or truncate the pairing code.
