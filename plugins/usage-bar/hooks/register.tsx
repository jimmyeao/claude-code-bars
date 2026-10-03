import { atom, read, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

import type { Limit } from '../types'

type Api = Parameters<Hook<'turn.complete'>>[0]

const snapshot = atom({ plugin: 'usage-bar', key: 'snapshot' } as const, null)
const isOn = atom({ plugin: 'usage-bar', key: 'isOn' } as const, true)

const HOUR = 3_600_000
const WINDOW_MS: Record<string, number> = { five_hour: 5 * HOUR, seven_day: 7 * 24 * HOUR }
const LABEL: Record<string, string> = { five_hour: 'Session', seven_day: 'Week', spend_limit: 'Spend' }
const COLOR: Record<string, string> = {
  five_hour: 'permission',
  seven_day: 'claude',
  spend_limit: 'success',
}
const LABEL_WIDTH = 8
const TEXT_WIDTH = 62
const MIN_GAP_MS = 10_000
const TICK_MS = 60_000

let lastReadAt = 0

const duration = (ms: number) => {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`

  return `${minutes}m`
}

// A bar's colour only ever says which window it is; the flag beside it says how it is going.
const colorFor = (l: Limit) => COLOR[l.kind] ?? 'suggestion'

// Percentage points of the window used beyond the share of its time that has passed.
const SLACK_POINTS = 5
const FAR_AHEAD_POINTS = 25

// Ahead of the clock = using the window faster than it is passing, past a little slack.
// A window with no known length (a spend limit) has no clock, so only a nearly full one is flagged.
function pace(used: number, passed: number | null) {
  // From the figures as shown, so the gap is exactly what subtracting the two printed numbers gives.
  const ahead = passed === null ? null : Math.round(used) - Math.round(passed * 100)
  const level =
    used >= 95 || (ahead !== null && ahead > FAR_AHEAD_POINTS)
      ? ('error' as const)
      : ahead !== null && ahead > SLACK_POINTS
        ? ('warning' as const)
        : undefined

  return { ahead, level }
}

// The bar: the used part solid, the rest shaded.
function cells(width: number, used: number) {
  const fill = Math.max(0, Math.min(width, Math.round((Math.min(used, 100) / 100) * width)))

  return { fill: '█'.repeat(fill), rest: '░'.repeat(width - fill) }
}

async function refresh($: Api, force = false) {
  const now = await $.clock.now()

  if (!force && now - lastReadAt < MIN_GAP_MS) return
  lastReadAt = now

  try {
    const usage = await $.session.usage()

    await update($, snapshot, () => ({
      limits: usage.rateLimits.map(r => ({
        kind: r.kind,
        percent: r.percentUsed,
        resetsAt: r.resetsAt ? Date.parse(r.resetsAt) : null,
      })),
      costUsd: usage.cost ? usage.cost.usd : null,
    }))
  } catch {
    // No session bound yet, or the read failed: keep the last bars.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'usage-bar',
      description: 'Toggle the plan usage bars above the prompt',
    })
    await refresh($, true)
    // Countdowns and the time marker move even when nothing is being said.
    void $.clock.every(TICK_MS, () => refresh($, true))

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($, true)

    return next(e)
  })

  on('command.run', { command: 'usage-bar' }, async $ => {
    const next = !(await read($, isOn))
    await update($, isOn, () => next)

    if (next) await refresh($, true)

    return { text: `Usage bar ${next ? 'on' : 'off'}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Whatever another band hook drew sits above ours: each hook draws on top of what is beneath it.
    const below = await next(e)
    const snap = await read($, snapshot)

    if (e.props.hasSurvey || snap === null || !(await read($, isOn))) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const barWidth = Math.max(10, Math.min(60, e.props.bodyColumns - LABEL_WIDTH - TEXT_WIDTH - 2))
    const cost = snap.costUsd === null ? '' : `  ·  session $${snap.costUsd.toFixed(2)}`

    return (
      <Box flexDirection="column">
        {below}
        <Text dimColor>{`Usage  ·  amber = using a window faster than its clock${cost}`}</Text>
        {snap.limits.length === 0 && <Text dimColor>No plan limits reported for this account.</Text>}
        {snap.limits.map(l => {
          const span = WINDOW_MS[l.kind]
          const left = l.resetsAt === null ? null : Math.max(0, l.resetsAt - now)
          const passed = span === undefined || left === null ? null : Math.max(0, Math.min(1, 1 - left / span))
          const color = colorFor(l)
          const bar = cells(barWidth, l.percent)
          const flag = pace(l.percent, passed)

          return (
            <Text key={l.kind}>
              <Text color={color}>{(LABEL[l.kind] ?? l.kind).padEnd(LABEL_WIDTH)}</Text>
              <Text color={color}>{bar.fill}</Text>
              <Text dimColor>{bar.rest}</Text>
              <Text color={flag.level} dimColor={flag.level === undefined}>{`  ${Math.round(l.percent)}% used`}</Text>
              <Text dimColor>{`${passed === null ? '' : `  ·  ${Math.round(passed * 100)}% of time`}`}</Text>
              {flag.ahead !== null && flag.level !== undefined && (
                <Text color={flag.level}>{`  ·  ${flag.ahead} pts ahead of the clock`}</Text>
              )}
              <Text dimColor>{`${left === null ? '' : `  ·  resets in ${duration(left)}`}`}</Text>
            </Text>
          )
        })}
      </Box>
    )
  })
}
