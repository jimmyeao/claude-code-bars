import { expect, mock, test } from 'claude-code/testing'

const usage = {
  startedAt: 0,
  rateLimits: [],
  context: {
    window: 200_000,
    tokens: 80_000,
    percent: 40,
    breakdown: {
      categories: [
        { name: 'System prompt', tokens: 8_000, color: 'permission', isDeferred: false, kind: 'used' },
        { name: 'Messages', tokens: 72_000, color: 'claude', isDeferred: false, kind: 'used' },
        { name: 'Free space', tokens: 90_000, color: 'promptBorder', isDeferred: false, kind: 'free' },
        { name: 'Autocompact buffer', tokens: 30_000, color: 'inactive', isDeferred: false, kind: 'buffer' },
      ],
      totalTokens: 80_000,
      maxTokens: 200_000,
      rawMaxTokens: 200_000,
      autocompactSource: 'auto',
      percentage: 40,
      gridRows: [],
      model: 'test-model',
      memoryFiles: [],
      mcpTools: [],
      agents: [],
      isAutoCompactEnabled: true,
      apiUsage: null,
    },
  },
} as const

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 12,
  bodyColumns: 40,
  scroll: { offset: 0, bodyRows: 11 },
  view: {},
} as const

test('/context-bar toggles the bar and the bar draws one segment per category', async ($, on) => {
  mock.clock(on)
  on('ui.render', async () => ({ type: 'Text', props: {}, children: ['another band'] }) as never)
  on('session.usage', async () => ({ value: usage }) as never)

  expect((await $.command.run({ command: 'context-bar' })).text).toBe('Context bar off.')
  expect((await $.command.run({ command: 'context-bar' })).text).toBe('Context bar on.')

  const ui = await $.ui.mount({
    plugin: 'context-bar',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: BAND as never,
    viewport: { columns: 80, rows: 24 } as never,
  })

  const bar = await ui.find({ type: 'Text', text: /█+▒+░+|█+░+▒+/ })
  const header = await ui.find({ type: 'Text', text: /Context 40% · 80\.0k\/200\.0k/ })

  expect(bar).toBeDefined()
  expect(header).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /another band/ })).toBeDefined()
})
