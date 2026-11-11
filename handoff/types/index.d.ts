// Context 已用的百分比，0 到 100
export type Percent = number

// 资讯条显示的内容；读不到的项目为 null
export type Info = {
  model: string | null
  project: string | null
  branch: string | null
  // 5 小时用量上限已用的百分比
  fiveHour: Percent | null
}

declare module 'claude-code' {
  interface PluginState {
    handoff: {
      percent: Percent
      hiddenBelow: Percent
      isRunning: boolean
      info: Info
      // 主对话最后一次回复完的时间（毫秒），还没回复过为 null
      lastReplyAt: number | null
      // 计时器最近一次刷新的时间（毫秒）
      clockNow: number
    }
  }
}
