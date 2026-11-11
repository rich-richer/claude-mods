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

// 每次读用量依序取下一组用量上限，取完后一直用最后一组
// 测试可以拨动的时钟
const clock = { now: Date.UTC(2026, 10, 2, 6, 30, 0) }
const MIN = 60_000

function engine(
  on: any,
  percent: number,
  calls: string[],
  limits: unknown[][] = [[{ kind: 'five_hour', percentUsed: 23 }]],
) {
  on('command.register', () => ({ value: { command: 'handoff' } }))
  on('ui.toast', () => ({ value: undefined }))
  // 引擎自己的画法：什么都不画
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { window: 200000, percent },
      rateLimits: limits.length > 1 ? limits.shift() : limits[0],
    },
  }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.measure', (_: unknown, e: { changed: string[] }) => ({ changed: e.changed }))
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    if (e.path === '/proj/.git/HEAD') return { value: 'ref: refs/heads/main\n' }
    throw new Error('ENOENT')
  })
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/proj' }))
  on('clock.now', () => ({ value: clock.now }))
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

test('below 60% the app shows the info bar without the button', async ($, on) => {
  engine(on, 40, [])
  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })

  for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /Opus 5\.5/ }))?.text).toBe('[Opus 5.5]')
    expect((await ui.find({ type: 'Text', text: /^proj$/ }))?.text).toBe('proj')
    expect((await ui.find({ type: 'Text', text: /^main$/ }))?.text).toBe('main')
    expect(await ui.find({ type: 'Text', text: /40%/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /5h/ }))?.text).toBe('5h 用量 23%')
    expect(await ui.find({ key: 'go' })).toBeUndefined()
    await ui.unmount()
  }
})

test('below 60% the terminal shows nothing', async ($, on) => {
  engine(on, 40, [])
  await $.session.start({ cwd: '/proj', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Context/ })).toBeUndefined()
  expect(await ui.find({ key: 'go' })).toBeUndefined()
  await ui.unmount()
})

test('at 65% the button hands off: summary, file, clear, first prompt', async ($, on) => {
  const calls: string[] = []
  engine(on, 65, calls)
  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })

  // 终端只有交接这一段；app 是资讯条加按钮，在同一行
  const term = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await term.find({ type: 'Text', text: /65%/ }))?.text).toBe('Context 已用 65%')
  expect(await term.find({ type: 'Text', text: /Opus/ })).toBeUndefined()
  await term.unmount()
  const app = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await app.find({ type: 'Text', text: /Opus 5\.5/ })).toBeDefined()
  expect(await app.find({ key: 'go' })).toBeDefined()
  await app.unmount()

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

test('an empty rate-limit reading keeps the last 5h figure', async ($, on) => {
  // 第一次有读数，之后计时器读到的都是空列表
  engine(on, 40, [], [[{ kind: 'five_hour', percentUsed: 23 }], []])
  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })
  await $.session.measure({ context: { window: 200000, percent: 40 }, rateLimits: [], changed: ['context'] })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /5h/ }))?.text).toBe('5h 用量 23%')
  await ui.unmount()
})

async function finishTurn($: any) {
  await $.turn.complete({ reason: 'answer', answer: 'ok', turnId: 't1', durationMs: 1, isAborted: false })
}

async function cacheText($: any) {
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const found = await ui.find({ type: 'Text', text: /缓存/ })
  await ui.unmount()
  return found?.text
}

test('the cache countdown shows only after a reply, then counts down and expires', async ($, on) => {
  clock.now = Date.UTC(2026, 10, 2, 6, 30, 0)
  engine(on, 40, [])
  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })
  expect(await cacheText($)).toBeUndefined()

  const repliedAt = clock.now
  await finishTurn($)
  expect(await cacheText($)).toBe('缓存 60 分')

  clock.now = repliedAt + 18 * MIN
  await $.session.measure({ context: { window: 200000, percent: 40 }, rateLimits: [], changed: ['context'] })
  expect(await cacheText($)).toBe('缓存 42 分')

  clock.now = repliedAt + 50 * MIN
  await $.session.measure({ context: { window: 200000, percent: 40 }, rateLimits: [], changed: ['context'] })
  expect(await cacheText($)).toBe('缓存 10 分')

  clock.now = repliedAt + 61 * MIN
  await $.session.measure({ context: { window: 200000, percent: 40 }, rateLimits: [], changed: ['context'] })
  expect(await cacheText($)).toBe('缓存已过期')
})

test('the cache countdown hides while Claude is working', async ($, on) => {
  clock.now = Date.UTC(2026, 10, 2, 6, 30, 0)
  engine(on, 40, [])
  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })
  await finishTurn($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, isWorking: true } })
  expect(await ui.find({ type: 'Text', text: /缓存/ })).toBeUndefined()
  await ui.unmount()
})
