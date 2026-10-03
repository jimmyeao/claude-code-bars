import { atom, read, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

import type { Slice } from '../types'

type Api = Parameters<Hook<'turn.complete'>>[0]

const snapshot = atom({ plugin: 'context-bar', key: 'snapshot' } as const, null)
const isOn = atom({ plugin: 'context-bar', key: 'isOn' } as const, true)

const GLYPH = { used: '█', buffer: '▒', free: '░' } as const

// A usage read costs a local estimate, so a burst of tool calls shares one.
const MIN_GAP_MS = 1500

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`

// Whole cells per slice that add up to `cells`: every used category that holds
// tokens keeps at least one, and the rounding slack lands on the widest slice.
function layout(slices: readonly Slice[], cells: number): number[] {
  const total = slices.reduce((n, s) => n + s.tokens, 0) || 1
  const widths = slices.map(s => {
    const share = Math.round((s.tokens / total) * cells)

    return s.kind === 'used' && s.tokens > 0 ? Math.max(1, share) : share
  })
  let slack = cells - widths.reduce((n, w) => n + w, 0)

  while (slack !== 0) {
    const step = slack > 0 ? 1 : -1
    let pick = -1

    widths.forEach((w, i) => {
      const canShrink = step > 0 || w > 1
      if (canShrink && (pick < 0 || w > widths[pick]!)) pick = i
    })
    if (pick < 0) break
    widths[pick]! += step
    slack -= step
  }

  return widths
}

let lastReadAt = 0

async function refresh($: Api, force = false) {
  const now = await $.clock.now()

  if (!force && now - lastReadAt < MIN_GAP_MS) return
  lastReadAt = now

  try {
    const usage = await $.session.usage({ breakdown: 'summary' })
    const b = usage.context.breakdown

    if (!b) return

    await update($, snapshot, () => ({
      window: b.rawMaxTokens,
      total: b.totalTokens,
      percent: b.percentage,
      slices: b.categories
        .filter(c => c.kind !== 'deferred' && c.tokens > 0)
        .map(c => ({ name: c.name, tokens: c.tokens, color: c.color, kind: c.kind as Slice['kind'] })),
    }))
  } catch {
    // No session bound yet, or the read failed: keep the last bar.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'context-bar',
      description: 'Toggle the context window bar above the prompt',
    })
    await refresh($, true)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($, true)

    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    await refresh($, true)

    return result
  })

  on('command.run', { command: 'context-bar' }, async $ => {
    const next = !(await read($, isOn))
    await update($, isOn, () => next)

    if (next) await refresh($, true)

    return { text: `Context bar ${next ? 'on' : 'off'}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Whatever another band hook drew stays: each hook draws on top of what is beneath it.
    const below = await next(e)
    const snap = await read($, snapshot)

    if (e.props.hasSurvey || snap === null || !(await read($, isOn))) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)
    const widths = layout(snap.slices, Math.max(10, e.props.bodyColumns))
    const used = snap.slices.filter(s => s.kind === 'used')

    return (
      <Box flexDirection="column">
        {below}
        <Text>
          {snap.slices.map((s, i) => (
            <Text key={s.name} color={s.color} dimColor={s.kind !== 'used'}>
              {GLYPH[s.kind].repeat(widths[i]!)}
            </Text>
          ))}
        </Text>
        <Text dimColor>
          {`Context ${Math.round(snap.percent)}% · ${fmt(snap.total)}/${fmt(snap.window)}  `}
          {used.map(s => (
            <Text key={s.name}>
              <Text color={s.color}>■</Text>
              {` ${s.name} ${fmt(s.tokens)}  `}
            </Text>
          ))}
        </Text>
      </Box>
    )
  })
}
