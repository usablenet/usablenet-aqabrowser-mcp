---
name: flow
description: Author or run a reusable QA flow (browser actions + AQA checkpoints)
argument-hint: "[<steps in prose> | run <slug> | list]"
metadata:
  user-summary: "Save a sequence of browser steps with AQA checkpoints as a named flow, run a saved flow, or list them."
---

A flow is a reusable QA script that walks the inspected tab through a sequence of browser actions (navigate, click, hover, type, select, wait) with one or more AQA `analyze` checkpoints. Flow files live under `.aqa/flows/<name>.json` at the workspace root (the MCP client's first root, or the server's anchor directory on hosts without roots) and are authored once, then re-run deterministically.

Delegate everything to the **`aqa-flow` subagent** — it handles author / run / list modes and writes only under `.aqa/flows/`. Pass the user's full prompt through; the agent picks the mode from the wording. Don't pre-route or paraphrase the prompt — the agent reads the verbs ("save", "run", "list", or step prose) to decide.

## Modes the agent supports

- **Author** — user describes the steps in prose ("open `https://example.com`, click the hamburger menu, run AQA"). Agent writes `.aqa/flows/<slug>.json` and reports the path. Doesn't auto-run.
- **Run** — user names a saved flow ("run home-hamburger", "rerun checkout"). Agent loads, executes, and returns a run report with one digest per `analyze` checkpoint.
- **List** — user asks what's saved ("what flows do I have?", "list flows"). Agent renders the index.

If the prompt is ambiguous between author and run, the agent defaults to list mode and reports the saved flows back so the user can clarify.

## Flow file shape

```json
{
  "name": "home-hamburger",
  "description": "Open the hamburger menu on the home page and analyze.",
  "startUrl": "https://example.com",
  "steps": [
    { "action": "navigate", "url": "https://example.com" },
    { "action": "click", "target": { "selector": "header > button.menu-toggle", "text": "Menu", "role": "button" } },
    { "action": "waitFor", "target": { "selector": "nav#mobile-menu", "role": "navigation" } },
    { "action": "analyze", "label": "menu-open" }
  ]
}
```

For hover menus (CSS `:hover` dropdowns, JS-driven tooltips), use the `hover` action and follow it with a `waitFor` so the menu stays open long enough for the next step:

```json
[
  { "action": "hover", "target": { "selector": "nav > li.products", "text": "Products" } },
  { "action": "waitFor", "target": { "text": "Wireless headphones", "role": "menuitem" } },
  { "action": "click", "target": { "text": "Wireless headphones", "role": "menuitem" } }
]
```

**Dual selectors** — each `target` carries a strict `selector` PLUS a `text` / `role+name` fallback. The runner tries strict first; the fallback keeps the flow working when the page changes.

**Per-step failure mode** — each step accepts `onError: "stop" | "continue"` (default `"stop"`). The author pass only sets `"continue"` when the user explicitly asks for it.

## When to use `/aqa:flow` vs other commands

- Single-page audit on the page in the session's bound tab → `/aqa:analyze-page`. No flow needed.
- Multi-page audit across distinct templates (home, product, cart) → `/aqa:audit-site` (select pages → per-page analyze + optional manual review + report → one `audit.html`), or `/aqa:crawl-site` when the user only wants the page shortlist saved as a flow. Use a flow only if the audit needs *interaction* (open menu, fill form, add to cart) before the analysis lands on the right state — crawl-produced flows are plain `navigate` + `analyze`, and `/aqa:flow run` can execute them too (digests only, no HTML).
- One specific user path you want to re-test repeatedly ("the checkout flow", "the booking funnel") → `/aqa:flow`. Author once, run any time.

## Hard rules (don't paraphrase to the agent)

- Author mode never auto-runs after saving.
- Run mode never edits the flow file (only the author pass writes).
- Every checkpoint runs full-page `aqa_analyze_page` (scoped subtree analysis is not implemented).
- Flows are same-tab, in-session only — every step runs against the session's bound tab; no new-tab navigation, no popup auth, no file uploads, no drag-and-drop.
- If `aqa_flow_load` returns `flow-not-found`, the agent stops; it does not silently fall back to author mode.
- If the agent returns `outcome: 'tools-unavailable'`, its MCP tools didn't attach to the spawn — a host wiring lapse, not a flow error. Don't author or run the flow inline in its place; tell the user to run `/reload-plugins` (or start a fresh session) and re-invoke.
