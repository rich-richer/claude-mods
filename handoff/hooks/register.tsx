import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

// 用到几成时出现按钮，几成以上变醒目颜色
const SHOW_AT = 60
const WARN_AT = 80

const percent = atom({ plugin: 'handoff', key: 'percent' } as const, 0)
// 按 × 后，到这个百分比才再出现
const hiddenBelow = atom({ plugin: 'handoff', key: 'hiddenBelow' } as const, 0)
const isRunning = atom({ plugin: 'handoff', key: 'isRunning' } as const, false)

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

async function refresh($: EngineInterface) {
  const { context } = await $.session.usage()
  const now = context.percent ?? 0
  await update($, percent, () => now)
  // 清空对话后 context 掉回去，× 的记录也跟着重置
  if (now < SHOW_AT) await update($, hiddenBelow, () => 0)
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
    if (e.agentId === undefined) await refresh($)

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

    if (e.props.hasSurvey || (!running && (now < SHOW_AT || now < hidden))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const isBusy = running || e.props.isWorking
    const isHot = now >= WARN_AT
    // 其他 mod（如 next-steps-plus）画的内容排在交接这一行下面
    const below = await next(e)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={2}>
          <Text color={isHot ? 'warning' : undefined} bold={isHot}>
            Context 已用 {now}%
          </Text>
          <Button
            key="go"
            label={running ? '交接中…' : '交接到新对话'}
            variant="primary"
            dimColor={isBusy}
            onPress={() => {
              if (!isBusy) void handoff($)
            }}
          />
          <Button
            key="hide"
            label="×"
            plain
            role="dismiss"
            onPress={() =>
              update($, hiddenBelow, () => (Math.floor(now / 10) + 1) * 10)
            }
          />
        </Box>
        {below}
      </Box>
    )
  })
}
