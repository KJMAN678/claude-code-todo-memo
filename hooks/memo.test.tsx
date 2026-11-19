import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'todo-memo',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

const memo = ($: any, args: string) =>
  $.command.run({ command: 'memo', args })

test('/memo saves without running anything, the band shows it, 済 removes it', async ($, on) => {
  let ranBeneath = false
  mock.store(on, { memos: [{ id: 'old', text: '経費精算' }] })
  on('command.register', () => ({ value: { command: 'memo' } }))
  on('command.run', () => {
    ranBeneath = true

    return { text: 'engine' }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const saved = await memo($, '明日はPRレビュー')
  expect(saved.text).toBe('メモを保存しました（2 件）')
  expect(saved.isTextDisplayOnly).toBe(true)
  expect(ranBeneath).toBe(false)
  expect((await memo($, '')).text).toBe('1. 経費精算\n2. 明日はPRレビュー')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /PRレビュー/ }))?.text).toBe(
      ' 2. 明日はPRレビュー',
    )
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'done-old' })
  expect(await ui.find({ type: 'Text', text: /経費精算/ })).toBeUndefined()
  await ui.unmount()

  expect((await memo($, 'done 5')).text).toContain('5 番のメモはありません。')
  expect((await memo($, 'done 1')).text).toBe('済: 明日はPRレビュー\n\nメモはありません。')

  const empty = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await empty.find({ type: 'Button' })).toBeUndefined()
  await empty.unmount()
})
