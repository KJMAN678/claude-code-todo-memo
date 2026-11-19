export type Memo = { id: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    'todo-memo': { memos: Shaped<Memo[]> }
  }
}
