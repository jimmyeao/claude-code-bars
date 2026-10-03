export type Limit = {
  /** `five_hour`, `seven_day`, a gateway's `spend_limit`, or whatever else the engine reports. */
  kind: string
  /** 0 to 100, past it on an exceeded spend limit. */
  percent: number
  /** When the window resets, in epoch milliseconds; null when the engine gave none. */
  resetsAt: number | null
}

export type Snapshot = {
  limits: Limit[]
  /** What the session has cost so far, in US dollars; null where there is no ledger. */
  costUsd: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'usage-bar': { snapshot: Snapshot | null; isOn: boolean }
  }
}
