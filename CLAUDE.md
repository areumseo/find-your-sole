# CLAUDE.md

The shared working agreements for this repository are in [`AGENTS.md`](./AGENTS.md). Read it first and follow it.

Claude-specific notes:

- Show the owner design options before applying visible UI or copy changes when the request is open-ended ("what do you think?"); apply directly when it is a clear instruction.
- Keep answers short and in Korean when replying to the owner; PR titles, bodies and commit messages are English.
- Commits end with the `Co-Authored-By` and `Claude-Session` lines required by the environment; PR bodies end with the Claude Code footer.
- Do not paste keys or tokens in chat or files; tell the owner to set them in the Render environment.
- After creating a PR, do not merge it; the owner does.
