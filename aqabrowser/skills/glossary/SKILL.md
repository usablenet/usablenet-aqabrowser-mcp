---
name: glossary
description: Look up an AQA-specific term (note, needs-fix vs check-manually, ruleset vs ruleset pack, methodology, exposure, ...) without guessing
argument-hint: "[term]"
metadata:
  user-summary: "Look up what an AQA term means: needs fix, check manually, ruleset pack, exposure, and so on."
---

Invoke the `aqa_glossary` MCP tool to ground your answer on AQA-authored terminology rather than training data.

- If the user's message names a specific term — pass it as `term` (canonical name OR alias works, case-insensitive). Returns one entry with `summary`, `details`, `related` cross-references, and the tool-arg the term maps to when applicable.
- If the user asked a general "what AQA terms should I know" / "explain the AQA vocabulary" — call with no arguments to return the full index (`{ kind: "index", terms: [...] }`).

When to reach for this **without** an explicit `/aqa:glossary` invocation:

- The user says "manual review", "auto-detected", "dismissed", "critical exposure", "ruleset pack" — terms whose AQA meaning is specific and easy to confuse with general accessibility wording. One glossary call is cheaper than a wrong-tool round-trip.
- You're about to phrase an answer about a `check manually` note — verify the phrasing rule (the note is **flagged for human review**, not a confirmed defect) before you assert anything.
- A user pastes an issue id that starts with `AM` and asks about it — the prefix tells you the status before any other tool call. Confirm via the glossary if you're not sure.

Response shape:

- `{ ok: true, kind: "entry", entry: { term, summary, details?, aliases?, related?, mapsTo? } }` — one term resolved.
- `{ ok: true, kind: "index", terms: [{ term, summary, aliases? }, ...] }` — full vocabulary.
- `{ ok: false, error: "term-not-found", query, near: [...] }` — unknown term, plus up to 3 nearest canonical names. If the user clearly meant one of those, retry with that.

When you've got the entry, **don't dump it verbatim**. Use `summary` + `details` to anchor your reply to the user; mention `mapsTo` only when the next step is a tool call that needs that arg.
