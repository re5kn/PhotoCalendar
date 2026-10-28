import { useState } from 'react'
import type { Tag } from '../types'

interface Props {
  tags: Tag[]
  selected: string[]
  onToggle: (id: string) => void
  onClearFilter: () => void
  onCreate: (name: string) => void
  onRename: (tag: Tag, name: string) => void
  onRecolor: (tag: Tag, color: string) => void
  onDelete: (tag: Tag) => void
}

export function Sidebar({ tags, selected, onToggle, onClearFilter, onCreate, onRename, onRecolor, onDelete }: Props) {
  const [name, setName] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (key: string, url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }
  const allIcsUrl = `${location.origin}/api/calendar.ics`

  return (
    <aside className="sidebar">
      <h2>タグ (カレンダー)</h2>
      <p className="hint">タグ 1 つが 1 つのカレンダーです。ICS の URL をカレンダーアプリで購読できます。</p>

      <ul className="tag-list">
        <li className={`tag-row${selected.length === 0 ? ' active' : ''}`}>
          <label>
            <input type="checkbox" checked={selected.length === 0} onChange={onClearFilter} />
            <span className="dot" style={{ background: '#999' }} />
            <span className="tag-name">すべての写真</span>
          </label>
          <span className="tag-actions">
            <a href={allIcsUrl} title="ICS をダウンロード">ICS</a>
            <button type="button" onClick={() => copy('all', allIcsUrl)}>
              {copied === 'all' ? 'コピー済' : 'URL'}
            </button>
          </span>
        </li>
        {tags.map((t) => (
          <li key={t.id} className={`tag-row${selected.includes(t.id) ? ' active' : ''}`}>
            <label>
              <input type="checkbox" checked={selected.includes(t.id)} onChange={() => onToggle(t.id)} />
              <input
                type="color"
                className="color"
                value={t.color}
                title="色を変更"
                onChange={(e) => onRecolor(t, e.target.value)}
              />
              <span
                className="tag-name"
                title="ダブルクリックで名前を変更"
                onDoubleClick={(e) => {
                  e.preventDefault()
                  const next = prompt('タグ名', t.name)?.trim()
                  if (next && next !== t.name) onRename(t, next)
                }}
              >
                {t.name}
              </span>
              <span className="count">{t.photoCount}</span>
            </label>
            <span className="tag-actions">
              <a href={t.icsUrl} title="ICS をダウンロード">ICS</a>
              <button type="button" onClick={() => copy(t.id, t.icsUrl)} title="購読用 URL をコピー">
                {copied === t.id ? 'コピー済' : 'URL'}
              </button>
              <button type="button" className="danger" title="タグを削除" onClick={() => onDelete(t)}>
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>

      <form
        className="new-tag"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onCreate(name.trim())
          setName('')
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="新しいタグ" />
        <button type="submit">追加</button>
      </form>
    </aside>
  )
}
