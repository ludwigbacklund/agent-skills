---
name: portable-agent-setup
description: Generalize repository AI-agent configuration by making AGENTS.md and .agents/skills canonical while preserving Claude Code compatibility through symlinks and thin adapters. Use when asked to make Claude instructions or skills portable, migrate CLAUDE.md, standardize agent files, or set up cross-harness agent configuration in the current repository.
---

# Portable Agent Setup

Make repository-level agent guidance portable without discarding harness-specific functionality.

## Workflow

1. Find the repository root and read its local contribution instructions before changing files.
2. Inventory tracked and untracked agent configuration, excluding dependencies, generated output, and `.git`:
   - `AGENTS.md`, `CLAUDE.md`, and nested equivalents
   - `.agents/skills/` and `.claude/skills/`
   - `.claude/settings*.json`, hooks, commands, agents, plugins, and MCP configuration
   - documentation references to Claude-specific paths
3. Inspect Git status first. Preserve unrelated user changes and determine which files are tracked.
4. Apply the instruction-file migration separately at each scope:
   - If `AGENTS.md` exists, treat it as canonical.
   - If only `CLAUDE.md` exists, move its content to `AGENTS.md` and replace Claude-specific wording with harness-neutral wording where accurate.
   - If both exist and differ, merge durable repository guidance into `AGENTS.md`. Do not overwrite ambiguous or conflicting instructions; ask the user when intent cannot be inferred safely.
   - Replace `CLAUDE.md` with a relative symlink to its sibling `AGENTS.md`.
5. Apply the skill migration:
   - Use `.agents/skills/<skill-name>/SKILL.md` as the canonical project location.
   - Move existing `.claude/skills` content into `.agents/skills`, preserving each skill's scripts, references, and assets.
   - Resolve same-name conflicts explicitly; never silently replace a skill.
   - Replace `.claude/skills` with the relative symlink `../.agents/skills` at repository root.
   - If there are no skills, create a trackable canonical directory only when establishing the compatibility symlink is useful.
   - Keep every skill compliant with the Agent Skills format: a matching lowercase hyphenated directory/name, and `name` plus a specific trigger-oriented `description` in `SKILL.md` frontmatter.
6. Keep non-portable integration as thin harness adapters:
   - Leave Claude settings, permissions, plugins, hooks, and custom-agent definitions under `.claude/` unless another harness has an equivalent format.
   - Move only genuinely reusable implementation into neutral locations such as `scripts/agent/`; update harness adapters to call it.
   - Do not pretend tool-specific configuration is standardized.
7. Update current documentation and policy references to point to `AGENTS.md` and `.agents/skills` as canonical. Preserve historical records unless they function as current guidance or the user explicitly requests rewriting them.
8. Add a concise section to the canonical `AGENTS.md` explaining skill placement, the Claude compatibility symlink, relative resource paths, and the separation of harness-specific configuration.
9. Validate before finishing:
   - Confirm all symlinks are relative and resolve.
   - Compare `AGENTS.md` and `CLAUDE.md` through the symlink.
   - Check migrated skills and their relative resource links.
   - Run repository-prescribed formatting or checks when relevant.
   - Run `git diff --check`, inspect the final diff, and report any intentionally retained harness-specific files or historical references.

Do not commit unless the user asks. Do not edit task-management files directly when repository instructions require a CLI.
