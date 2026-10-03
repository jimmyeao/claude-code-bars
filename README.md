# claude-code-bars

Two small mods for [Claude Code](https://claude.com/claude-code) that draw bars in the band above the prompt:

| Mod | Draws | Toggle |
|---|---|---|
| [`context-bar`](plugins/context-bar) | Your context window as one stacked bar, a colour per `/context` category | `/context-bar` |
| [`usage-bar`](plugins/usage-bar) | Your plan usage limits as bars, flagged when you are using a window faster than its clock | `/usage-bar` |

They stack: with both on, the context bar and the usage bars show together.

## Install

From the marketplace (updates with `claude plugin update`):

```
claude plugin marketplace add jimmyeao/claude-code-bars
claude plugin install context-bar@claude-code-bars
claude plugin install usage-bar@claude-code-bars
```

Or by hand: copy a folder from `plugins/` into `~/.claude/skills/` and it loads from your next session.

Or for one session only:

```
claude --plugin-dir ./plugins/context-bar --plugin-dir ./plugins/usage-bar
```

## Before you install

- **A mod is code that runs inside your sessions.** These two only read figures Claude Code already computes (the context breakdown, the plan limits and the session cost) and draw them. They make no network calls and write nothing outside the session's own state. Read `plugins/*/hooks/register.tsx` to check; each is under 200 lines.
- **Built and tested on Claude Code 2.1.288.** The mod API is new; older versions may not load these.
- Each mod starts **on** in every new session. The toggle is not remembered between sessions.

## Develop

```
claude plugin validate .                    # the marketplace
claude plugin validate plugins/usage-bar    # a mod
claude plugin test plugins/usage-bar        # its tests
```

## Licence

MIT. See [LICENSE](LICENSE).
