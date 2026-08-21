# Agent Skills

Personal Agent Skills shared by Pi and Claude Code.

## Layout

Each skill lives in its own directory with a `SKILL.md` manifest. The active global
skill directory is `~/.agents/skills`; on this machine it points here. Claude Code
uses the compatibility link at `~/.claude/skills`.

## Updating

Edit a skill here, then commit and push:

```sh
git add .
git commit -m "Update <skill>"
git push
```

Keep generated environments, credentials, and machine-specific state out of the
repository.
