import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Memo } from '../types'

const KEY = 'memos'
// The band's copy of the list; $.store is the source of truth.
const memos = atom({ plugin: 'todo-memo', key: 'memos' } as const, [], {
  shape: 'memos-1',
})

const load = async ($: EngineInterface): Promise<Memo[]> =>
  ((await $.store.get(KEY)) as Memo[] | undefined) ?? []

// Re-reads the store before every write, so a memo another session added
// since this one started is never overwritten.
const change = async ($: EngineInterface, fn: (list: Memo[]) => Memo[]) => {
  const list = fn(await load($))
  await $.store.set(KEY, list)
  await update($, memos, () => list)

  return list
}

const format = (list: Memo[]) =>
  list.length === 0
    ? 'メモはありません。'
    : list.map((m, i) => `${i + 1}. ${m.text}`).join('\n')

// isTextDisplayOnly keeps the memo out of every model request.
const reply = (text: string) => ({ text, isTextDisplayOnly: true as const })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'memo',
      description:
        'TODO メモ（モデルは動かない）: /memo テキスト | /memo | /memo done N | /memo clear',
    })
    const list = await load($)
    await update($, memos, () => list)

    return next(e)
  })

  // Answers without next(e): no command runs and the model is never asked.
  on('command.run', { command: 'memo' }, async ($, e) => {
    const args = e.args.trim()

    if (args === '') {
      return reply(format(await load($)))
    }

    if (args === 'clear') {
      await change($, () => [])

      return reply('メモをすべて削除しました。')
    }

    const done = /^done\s+(\d+)$/.exec(args)
    if (done) {
      const n = Number(done[1])
      let removed: Memo | undefined
      const list = await change($, l => {
        removed = l[n - 1]

        return l.filter((_, i) => i !== n - 1)
      })

      return reply(
        removed
          ? `済: ${removed.text}\n\n${format(list)}`
          : `${n} 番のメモはありません。\n\n${format(list)}`,
      )
    }

    const list = await change($, l => [
      ...l,
      { id: crypto.randomUUID(), text: args },
    ])

    return reply(`メモを保存しました（${list.length} 件）`)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, memos)

    if (e.props.hasSurvey || list.length === 0) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text bold>TODO メモ</Text>
        {list.map((m, i) => (
          <Box>
            <Button
              key={`done-${m.id}`}
              label="済"
              onPress={() => change($, l => l.filter(x => x.id !== m.id))}
            />
            <Text>
              {' '}
              {i + 1}. {m.text}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
