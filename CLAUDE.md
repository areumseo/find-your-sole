# CLAUDE.md

**The source of truth for this repository's rules is [`AGENTS.md`](./AGENTS.md).** Read it before starting any task; this file only adds
Claude-specific notes and must not repeat or override the shared rules. If something here conflicts with `AGENTS.md`, `AGENTS.md` wins.

Claude-specific notes:

- Before editing, share the scope and the main files with the owner (see "Starting a task" in `AGENTS.md`), and check the open PR list for overlapping work.
- Start every task from the latest `origin/main` and open the PR against `main`. The owner merges; merge a PR yourself only when the owner explicitly asks for that PR (see `AGENTS.md`).
- Show the owner design options before applying visible UI or copy changes when the request is open-ended ("what do you think?"); apply directly when it is a clear instruction.
- Reply to the owner in Korean and keep it short; PR titles, bodies and commit messages are English.
- Commits end with the `Co-Authored-By` and `Claude-Session` lines required by the environment; PR bodies end with the Claude Code footer.
- Never paste keys or tokens in chat or files; tell the owner to set them in the Render environment.
