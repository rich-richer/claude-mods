import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'next-steps-plus',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const REPLY = JSON.stringify([
  { label: 'run the tests you just wrote', prompt: 'run the tests you just wrote' },
  { label: '/code-review high', prompt: '/code-review high' },
])

function engine(on: any, filled: string[]) {
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('command.list', () => ({
    value: [{ name: 'code-review', description: 'Review the diff', source: 'plugin' }],
  }))
  on('model.fork', () => ({ value: { isAnswered: true, text: REPLY, usage: {} } }))
  on('prompt.suggest', () => ({ isShown: true }))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.fill', (_: unknown, e: { text: string }) => {
    filled.push(e.text)
    return { isFilled: true }
  })
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
}

async function finishTurn($: any) {
  await $.turn.complete({
    reason: 'answer',
    answer: 'x'.repeat(200),
    turnId: 't1',
    durationMs: 1,
    isAborted: false,
  })
  await new Promise(r => setTimeout(r, 50))
}

test('suggestions draw on every surface, colored by theme key', async ($, on) => {
  engine(on, [])
  await finishTurn($)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /^next:$/ }))?.text).toBe('next:')
    expect(await ui.find({ key: 's0' })).toBeDefined()
    expect(await ui.find({ key: 's1' })).toBeDefined()
    expect(await ui.find({ key: 'dismiss' })).toBeDefined()
    await ui.unmount()
  }
})

test('pressing a suggestion drafts it and hides the list', async ($, on) => {
  const filled: string[] = []
  engine(on, filled)
  await finishTurn($)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 's1' })
  expect(filled).toEqual(['/code-review high'])
  expect(await ui.find({ key: 's0' })).toBeUndefined()
  await ui.unmount()
})
