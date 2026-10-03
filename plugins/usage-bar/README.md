# usage-bar

Draws your plan usage limits as bars above the prompt, and flags a window you are using faster than its clock (illustrative output, not real figures):

```
Usage  ·  amber = using a window faster than its clock  ·  session $12.19
Session █████████████████████░░░░░  79% used  ·  47% of time  ·  32 pts ahead of the clock  ·  resets in 2h 40m
Week    ███░░░░░░░░░░░░░░░░░░░░░░░  10% used  ·  61% of time  ·  resets in 2d 18h
```

- **One bar per limit window** the engine reports: `Session` (5 hours), `Week` (7 days), and `Spend` for a gateway spend limit. The colour says which window it is. The solid part is what you have used, the shaded part is what is left.
- **`% of time`** is how much of the window has already passed, worked out from its reset time.
- **The flag** compares the two printed numbers. More than 5 points ahead turns `% used` amber and adds `N pts ahead of the clock`. More than 25 points ahead, or 95% used or more, turns it red. A window with no known length (the spend limit) has no clock, so it is flagged only when nearly full.
- **Session cost** appears in the header line.

## Use

`/usage-bar` toggles it. It starts on in every session.

## How it works

- Reads `$.session.usage()`: the rate-limit windows from the last API response, and the session cost.
- Refreshes after each prompt and finished turn, and once a minute so the countdowns keep moving.
- Draws in the `AbovePrompt` band, on top of whatever other band mods draw there. It steps aside while a survey is showing.

## Limits

- It shows only the windows the engine reports. There are no per-model rows (for example Sonnet-only), so it will not match every line of `/usage`.
- Off a subscription plan there are no limits to draw, and it says "No plan limits reported for this account."
- The 5-hour and 7-day window lengths are assumed. If a window is not exactly that long, `% of time` is approximate.
