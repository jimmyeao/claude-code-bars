import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 12,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 11 },
  view: {},
} as const

const HOUR = 3_600_000

test('/usage-bar toggles and draws one bar per window with usage and time left', async ($, on) => {
  const clock = mock.clock(on)
  const at = (ms: number) => new Date(clock.now() + ms).toISOString()

  on('session.usage', async () =>
    ({
      value: {
        startedAt: 0,
        context: { window: 200_000 },
        cost: { usd: 1.5 },
        rateLimits: [
          { kind: 'five_hour', percentUsed: 20, resetsAt: at(3 * HOUR + 12 * 60_000) },
          { kind: 'seven_day', percentUsed: 81.5, resetsAt: at(2 * 24 * HOUR + 4 * HOUR) },
        ],
      },
    }) as never,
  )
  // The engine's own band draws nothing; a plugin beneath ours draws one line, which must survive.
  on('ui.render', async () => ({ type: 'Text', props: {}, children: ['another band'] }) as never)

  expect((await $.command.run({ command: 'usage-bar' })).text).toBe('Usage bar off.')
  expect((await $.command.run({ command: 'usage-bar' })).text).toBe('Usage bar on.')

  const ui = await $.ui.mount({
    plugin: 'usage-bar',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: BAND as never,
    viewport: { columns: 120, rows: 30 } as never,
  })

  // 20% used with 36% of the window gone: on pace, nothing flagged.
  expect(await ui.find({ type: 'Text', text: /Session.*20% used.*36% of time.*resets in 3h 12m/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Session.*ahead of the clock/ })).toBeUndefined()
  // 82% used with 69% of the week gone: 13 points ahead, flagged.
  expect(await ui.find({ type: 'Text', text: /Week.*82% used.*69% of time.*13 pts ahead of the clock.*resets in 2d 4h/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /│/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /session \$1\.50/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /another band/ })).toBeDefined()
})

test('with no plan limits it says so instead of drawing empty bars', async ($, on) => {
  mock.clock(on)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }) as never)
  on('ui.render', async () => ({ type: 'Text', props: {}, children: [] }) as never)

  await $.command.run({ command: 'usage-bar' })
  await $.command.run({ command: 'usage-bar' })

  const ui = await $.ui.mount({
    plugin: 'usage-bar',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: BAND as never,
    viewport: { columns: 120, rows: 30 } as never,
  })

  expect(await ui.find({ type: 'Text', text: /No plan limits reported/ })).toBeDefined()
})
