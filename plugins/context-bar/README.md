# context-bar

Draws your context window as a stacked bar above the prompt (illustrative output, not real figures):

```
█████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒
Context 42% · 419.0k/1.0M  ■ System prompt 3.7k  ■ System tools 34.6k  ■ Messages 380k
```

- **One segment per category**, in the same colours `/context` uses. Used categories are solid, the autocompact buffer is shaded, and free space is dim.
- **Every non-empty category gets at least one cell**, so small ones such as MCP instructions never vanish.
- **A legend line** under the bar: percent used, tokens against the window, and each used category with its token count.

## Use

`/context-bar` toggles it. It starts on in every session.

## How it works

- Reads `$.session.usage({ breakdown: 'summary' })`, the same breakdown `/context` shows. `summary` is a local estimate and sends no token-count requests.
- Refreshes after each prompt, tool call (at most once every 1.5 s), finished turn and compaction.
- Draws in the `AbovePrompt` band, on top of whatever other band mods draw there. It steps aside while a survey is showing.

## Limits

- Token counts are the engine's estimates, so the total can differ slightly from the live figure the status line shows.
- With many used categories the legend line may wrap on a narrow terminal.
