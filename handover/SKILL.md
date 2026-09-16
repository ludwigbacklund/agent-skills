---
name: handover
description: Write a succinct, self-contained handover prompt for a new agent to take over the current work. Use when the user invokes /handover or asks to hand off, transfer context, continue in a fresh session, or prepare another agent to take over.
---

# Handover

Create a concise prompt that an incoming agent can act on without reading the full conversation.

1. Inspect the conversation and, when relevant, the current repository state, changed files, task artifacts, and verification results. Do not continue implementation.
2. Include only actionable context:
   - objective and acceptance criteria
   - work completed and current state
   - important decisions, constraints, and conventions
   - relevant files, commands, tests, and observed results
   - unresolved issues, risks, and exact next steps
3. Clearly distinguish verified facts from assumptions. Never claim a check passed unless it was run, and never include secrets or irrelevant history.
4. If progress depends on the user, state `Awaiting user instruction:` followed by the specific decision or information needed, and tell the incoming agent to pause for that response. Otherwise, tell the incoming agent to proceed with the next step.
5. Output the handover as one copy-ready prompt, preferably in a fenced text block. Keep it succinct while preserving details needed to resume safely.
