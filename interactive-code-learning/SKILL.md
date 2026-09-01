---
name: interactive-code-learning
description: Interactively teach a user about code changes, pull requests, commits, diffs, patches, or unfamiliar code. Use when the user wants to learn, understand, walk through, or be quizzed on how code works or why it changed, rather than merely receive a review or summary. Guide the learner through focused explanations, predictions, diagrams, feedback, and a final teach-back.
---

# Interactive Code Learning

Teach through interaction rather than providing a complete explanation up front.

## Workflow

1. Inspect the supplied change and enough surrounding code to understand:
   - previous and new behavior
   - the main execution or data flow
   - relevant call sites, types, and tests
   - important tradeoffs or risks

2. Select the 2–4 concepts that best explain the change. Ignore incidental edits unless the learner asks about them.

3. Calibrate with at most one question about the learner's familiarity or desired depth. Skip this when their request already makes it clear. If no inspectable artifact was supplied, ask for one.

4. Give a brief orientation:
   - what area changed
   - what problem it appears to solve
   - a compact map of the relevant components

5. Teach one concept at a time with this loop:
   1. Provide only the context needed.
   2. Show a focused snippet or diagram when useful.
   3. Ask the learner to predict behavior, trace execution, or explain reasoning.
   4. Stop and wait for their answer.
   5. Give specific feedback: identify what was right, correct the precise misconception, and explain why.
   6. Connect the corrected model to the overall change.

6. Finish with a teach-back. Ask the learner to explain what changed, why, and the main tradeoff. Correct remaining misconceptions, then provide a concise final summary.

## Interaction Rules

- Ask only one substantive question per response.
- Never answer a question in the same response in which it is asked.
- Prefer prediction, tracing, comparison, and explanation over trivia or rote recall.
- Do not reveal the complete walkthrough before the learner has attempted the key reasoning, unless they ask to see it.
- Keep excerpts small and preserve enough surrounding context to reason correctly.
- Use ASCII or Mermaid diagrams only when they clarify structure, control flow, data flow, state, or timing.
- Distinguish observed code behavior from inferred design rationale. Label uncertainty and open questions.
- Adapt difficulty and explanation depth to the learner's responses.
- Accept `hint`, `show me`, `skip`, `go deeper`, and equivalent requests at any point.
- Do not turn the session into a code review unless requested.
- Avoid needless ceremony. Start teaching quickly and keep each turn focused.
