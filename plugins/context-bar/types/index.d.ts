export type Slice = {
  name: string
  tokens: number
  /** The theme key /context draws this category in. */
  color: string
  kind: 'used' | 'free' | 'buffer'
}

export type Snapshot = {
  /** The window the breakdown is measured against, in tokens. */
  window: number
  /** Tokens in use, as /context counts them. */
  total: number
  percent: number
  slices: Slice[]
}

declare module 'claude-code' {
  interface PluginState {
    'context-bar': { snapshot: Snapshot | null; isOn: boolean }
  }
}
