import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeKey } from 'claude-code'

import type { Info } from '../types'

// 用到几成时出现按钮，几成以上变醒目颜色
const SHOW_AT = 60
const WARN_AT = 80
const BAR_CELLS = 10
// 订阅方案的提示缓存约 60 分钟没有新请求就过期；用量超额时会缩短为 5 分钟，这里不区分
const CACHE_MINUTES = 60
const CACHE_WARN_MINUTES = 15
const CACHE_HOT_MINUTES = 5

const percent = atom({ plugin: 'handoff', key: 'percent' } as const, 0)
// 按 × 后，到这个百分比才再出现
const hiddenBelow = atom({ plugin: 'handoff', key: 'hiddenBelow' } as const, 0)
const isRunning = atom({ plugin: 'handoff', key: 'isRunning' } as const, false)
const info = atom({ plugin: 'handoff', key: 'info' } as const, {
  model: null,
  project: null,
  branch: null,
  fiveHour: null,
} as Info)
// 主对话最后一次回复完的时间，和计时器刷新时的当前时间，用来算缓存还剩几分钟
const lastReplyAt = atom({ plugin: 'handoff', key: 'lastReplyAt' } as const, null as number | null)
const clockNow = atom({ plugin: 'handoff', key: 'clockNow' } as const, 0)

const SUMMARY_PROMPT = `请为这段对话写一份交接摘要，让一个全新的对话（看不到以上任何内容）可以无缝接手。
只输出摘要本身，用中文、Markdown，依序包含这 6 段：

## 目标
这次要做成什么。

## 已完成
已经做完的事。

## 未完成 / 下一步
还没做的事，按先后顺序编号列出。

## 改过的文件
每个文件写完整路径，后面一句话说改了什么。

## 要注意的地方
踩过的坑、做过的决定和原因、不能动的东西。

## 关键信息
新对话要用到的命令、网址、设定值等，原样保留。`

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function stamp(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

// claude-opus-5-5 → Opus 5.5；认不出的名称原样显示
function modelName(id: string) {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(id)
  if (m === null) return id
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}`
}

function baseName(path: string) {
  return path.replace(/\/+$/, '').split('/').pop() || path
}

// 从 .git/HEAD 读分支；不是 git 仓库或读不到就是 null
async function branchOf($: EngineInterface, root: string) {
  try {
    const head = (await $.fs.read(`${root}/.git/HEAD`)).trim()
    if (head.startsWith('ref: refs/heads/')) return head.slice('ref: refs/heads/'.length)
    return /^[0-9a-f]{7,}$/.test(head) ? head.slice(0, 7) : null
  } catch {
    return null
  }
}

function barColor(now: number): ThemeKey {
  if (now >= WARN_AT) return 'error'
  return now >= SHOW_AT ? 'warning' : 'success'
}

function cacheColor(minutesLeft: number): ThemeKey {
  if (minutesLeft <= CACHE_HOT_MINUTES) return 'error'
  return minutesLeft <= CACHE_WARN_MINUTES ? 'warning' : 'inactive'
}

async function refresh($: EngineInterface) {
  const t = await $.clock.now()
  await update($, clockNow, () => t)
  const { context, rateLimits } = await $.session.usage()
  const now = context.percent ?? 0
  await update($, percent, () => now)
  // 清空对话后 context 掉回去，× 的记录也跟着重置
  if (now < SHOW_AT) await update($, hiddenBelow, () => 0)

  const root = await $.session.root()
  const model = modelName(await $.session.model())
  const branch = await branchOf($, root)
  const fiveHour = rateLimits.find(r => r.kind === 'five_hour')?.percentUsed
  // 用量只在有读数时才更新；计时器那边常读到空列表，不能拿来清掉上一次的数字
  await update($, info, prev => ({
    model,
    project: baseName(root),
    branch,
    fiveHour: fiveHour ?? prev.fiveHour,
  }))
}

async function handoff($: EngineInterface): Promise<string> {
  if (await read($, isRunning)) return '交接已在进行中。'
  await update($, isRunning, () => true)
  try {
    $.ui.toast('正在写交接摘要…')
    const reply = await $.model.fork({ prompt: SUMMARY_PROMPT })
    if (!reply.isAnswered) {
      const text = `交接摘要没写成（${reply.reason}），对话没有清空。`
      $.ui.toast(text)
      return text
    }

    const root = await $.session.root()
    const path = `${root}/.claude/handoffs/${stamp(await $.clock.now())}.md`
    await $.fs.write(path, reply.text)
    $.ui.toast(`已存到 ${path}`)

    await $.command.run({ command: 'clear' })
    await $.prompt.submit({
      text: `接续上一段工作，交接摘要文件在 ${path}\n\n${reply.text}`,
      asUser: true,
    })
    $.ui.toast('已开新对话')

    return `已交接，摘要存在 ${path}`
  } finally {
    await update($, isRunning, () => false)
    await refresh($)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'handoff',
      description: '写交接摘要、存档、清空对话，并在新对话接续',
    })
    await refresh($)
    $.clock.every(15_000, () => void refresh($))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const t = await $.clock.now()
      await update($, lastReplyAt, () => t)
      await refresh($)
    }

    return next(e)
  })

  // 引擎每轮结束、用量变动时主动推送最新读数
  on('session.measure', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('command.run', { command: 'handoff' }, async $ => {
    // 等这条指令跑完、对话空闲后再开始，清空才不会被拒绝
    $.clock.after(0, () => void handoff($))

    return { text: '开始交接…' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, percent)
    const hidden = await read($, hiddenBelow)
    const running = await read($, isRunning)
    const shown = await read($, info)
    const repliedAt = await read($, lastReplyAt)
    const clock = await read($, clockNow)
    // 资讯条只在 app 里画，终端交给 claude-hud
    const showInfo = e.surface !== 'terminal'
    const showHandoff = running || (now >= SHOW_AT && now >= hidden)

    if (e.props.hasSurvey || (!showInfo && !showHandoff)) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const isBusy = running || e.props.isWorking
    const isHot = now >= WARN_AT
    // 其他 mod（如 next-steps-plus）画的内容排在这一行下面
    const below = await next(e)
    const filled = Math.round((Math.min(100, now) / 100) * BAR_CELLS)
    // 回复中缓存正在续期，不显示；还没回复过一轮也不显示
    const cacheLeft =
      repliedAt === null || e.props.isWorking
        ? null
        : Math.ceil(CACHE_MINUTES - (Math.max(clock, repliedAt) - repliedAt) / 60_000)
    const parts = [
      shown.model && <Text color="suggestion">[{shown.model}]</Text>,
      shown.project && <Text>{shown.project}</Text>,
      shown.branch && <Text color="inactive">{shown.branch}</Text>,
      <Text>
        <Text color="inactive">Context </Text>
        <Text color={barColor(now)}>{'█'.repeat(filled)}</Text>
        <Text color="inactive">{'░'.repeat(BAR_CELLS - filled)}</Text>
        <Text color={barColor(now)}> {now}%</Text>
      </Text>,
      shown.fiveHour !== null && (
        <Text color="inactive">5h 用量 {Math.round(shown.fiveHour)}%</Text>
      ),
      cacheLeft !== null &&
        (cacheLeft > 0 ? (
          <Text color={cacheColor(cacheLeft)}>缓存 {cacheLeft} 分</Text>
        ) : (
          <Text color="error">缓存已过期</Text>
        )),
    ].filter(Boolean)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {showInfo &&
            parts.flatMap((part, i) =>
              i === 0 ? [part] : [<Text color="inactive">│</Text>, part],
            )}
          {!showInfo && (
            <Text color={isHot ? 'warning' : undefined} bold={isHot}>
              Context 已用 {now}%
            </Text>
          )}
          {showHandoff && (
            <Button
              key="go"
              label={running ? '交接中…' : '交接到新对话'}
              variant="primary"
              dimColor={isBusy}
              onPress={() => {
                if (!isBusy) void handoff($)
              }}
            />
          )}
          {showHandoff && (
            <Button
              key="hide"
              label="×"
              plain
              role="dismiss"
              onPress={() =>
                update($, hiddenBelow, () => (Math.floor(now / 10) + 1) * 10)
              }
            />
          )}
        </Box>
        {below}
      </Box>
    )
  })
}
