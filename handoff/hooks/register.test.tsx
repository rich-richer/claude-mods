import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'handoff',
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

function engine(on: any, percent: number, calls: string[]) {
  on('command.register', () => ({ value: { command: 'handoff' } }))
  on('ui.toast', () => ({ value: undefined }))
  // 引擎自己的画法：什么都不画
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, percent }, rateLimits: [] },
  }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/proj' }))
  on('clock.now', () => ({ value: Date.UTC(2026, 10, 2, 6, 30, 0) }))
  on('clock.every', () => ({ value: undefined }))
  on('model.fork', () => {
    calls.push('fork')
    return { value: { isAnswered: true, text: '## 目标\n做 mod', usage: {} } }
  })
  on('fs.write', (_: unknown, e: { path: string }) => {
    calls.push(`write ${e.path}`)
    return { value: undefined }
  })
  on('command.run', (_: unknown, e: { command: string }) => {
    calls.push(`run ${e.command}`)
    return { text: '' }
  })
  on('prompt.submit', (_: unknown, e: { text: string }) => {
    calls.push(`submit ${e.text.split('\n')[0]}`)
    return { text: e.text }
  })
}

test('below 60% the band shows nothing', async ($, on) => {
  engine(on, 40, [])
  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ key: 'go' })).toBeUndefined()
  await ui.unmount()
})

test('at 65% the button hands off: summary, file, clear, first prompt', async ($, on) => {
  const calls: string[] = []
  engine(on, 65, calls)
  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /65%/ }))?.text).toBe('Context 已用 65%')
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'go' })
  await new Promise(r => setTimeout(r, 50))
  expect(calls[0]).toBe('fork')
  expect(calls[1]).toMatch(/^write \/proj\/\.claude\/handoffs\/\d{4}-\d{2}-\d{2}-\d{6}\.md$/)
  expect(calls[2]).toBe('run clear')
  expect(calls[3]).toMatch(/^submit 接续上一段工作/)
  await ui.unmount()
})

test('× hides the band until the next tenth', async ($, on) => {
  engine(on, 65, [])
  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'hide' })
  expect(await ui.find({ key: 'go' })).toBeUndefined()
  await ui.unmount()
})
