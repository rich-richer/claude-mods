// Context 已用的百分比，0 到 100
export type Percent = number

declare module 'claude-code' {
  interface PluginState {
    handoff: { percent: Percent; hiddenBelow: Percent; isRunning: boolean }
  }
}
