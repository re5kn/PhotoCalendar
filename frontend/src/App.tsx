import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import { MonthView } from './components/MonthView'
import { PhotoModal } from './components/PhotoModal'
import { Sidebar } from './components/Sidebar'
import { TimeGrid } from './components/TimeGrid'
import { addDays, addMonths, formatDate, monthGrid, startOfDay, startOfWeek } from './dates'
import type { Photo, Tag, ViewMode } from './types'

const VIEW_LABELS: Record<ViewMode, string> = { day: '日', week: '週', month: '月' }

function visibleRange(view: ViewMode, cursor: Date): [Date, Date] {
  switch (view) {
    case 'day':
      return [startOfDay(cursor), addDays(cursor, 1)]
    case 'week':
      return [startOfWeek(cursor), addDays(startOfWeek(cursor), 7)]
    case 'month': {
      const grid = monthGrid(cursor)
      return [grid[0], addDays(grid[grid.length - 1], 1)]
    }
  }
}

function rangeTitle(view: ViewMode, cursor: Date): string {
  if (view === 'month') return `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`
  if (view === 'day') return formatDate(cursor)
  const start = startOfWeek(cursor)
  const end = addDays(start, 6)
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`
}

export default function App() {
  const [view, setView] = useState<ViewMode>('month')
  const [today] = useState(() => startOfDay(new Date()))
  const [cursor, setCursor] = useState(today)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [filter, setFilter] = useState<string[]>([])
  const [openPhoto, setOpenPhoto] = useState<Photo | null>(null)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [from, to] = useMemo(() => visibleRange(view, cursor), [view, cursor])
  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const reloadPhotos = useCallback(() => api.listPhotos(from, to, filter).then(setPhotos), [from, to, filter])
  const reloadTags = useCallback(() => api.listTags().then(setTags), [])

  useEffect(() => {
    reloadPhotos().catch((e) => setMessage(String(e)))
  }, [reloadPhotos])
  useEffect(() => {
    reloadTags().catch((e) => setMessage(String(e)))
  }, [reloadTags])

  const move = (dir: -1 | 1) =>
    setCursor((c) => (view === 'month' ? addMonths(c, dir) : addDays(c, dir * (view === 'week' ? 7 : 1))))

  const openDay = (day: Date) => {
    setCursor(day)
    setView('day')
  }

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    try {
      const created = await api.uploadPhotos(images)
      // 最後にアップロードした写真の日付へ移動して、すぐに確認できるようにする
      const last = created[created.length - 1]
      if (last) setCursor(startOfDay(new Date(last.takenAt)))
      setMessage(`${created.length} 枚の写真を追加しました`)
      await Promise.all([reloadPhotos(), reloadTags()])
    } catch (e) {
      setMessage(`アップロードに失敗しました: ${e}`)
    }
  }

  const updatePhoto = async (id: string, patch: Parameters<typeof api.updatePhoto>[1]) => {
    const updated = await api.updatePhoto(id, patch)
    setPhotos((ps) => ps.map((p) => (p.id === id ? updated : p)))
    setOpenPhoto((o) => (o?.id === id ? updated : o))
    // 日付を変えたら、その日付へ移動する
    if (patch.takenAt) setCursor(startOfDay(new Date(updated.takenAt)))
    if (patch.tagIds) await reloadTags()
  }

  const createTag = async (name: string) => {
    const tag = await api.createTag(name)
    await reloadTags()
    return tag
  }

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(t)
  }, [message])

  return (
    <div
      className="app"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        upload([...e.dataTransfer.files])
      }}
    >
      <header className="toolbar">
        <h1>写真カレンダー</h1>
        <button type="button" onClick={() => setCursor(today)}>
          今日
        </button>
        <div className="nav">
          <button type="button" onClick={() => move(-1)} aria-label="前へ">
            ‹
          </button>
          <button type="button" onClick={() => move(1)} aria-label="次へ">
            ›
          </button>
        </div>
        <h2 className="range">{rangeTitle(view, cursor)}</h2>
        <div className="segmented">
          {(['day', 'week', 'month'] as const).map((v) => (
            <button type="button" key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <button type="button" className="primary" onClick={() => fileInput.current?.click()}>
          写真を追加
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            upload([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </header>

      <div className="main">
        <Sidebar
          tags={tags}
          selected={filter}
          onToggle={(id) => setFilter((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))}
          onClearFilter={() => setFilter([])}
          onCreate={(name) => createTag(name)}
          onRename={(t, name) => api.updateTag(t.id, { name }).then(reloadTags)}
          onRecolor={(t, color) => api.updateTag(t.id, { color }).then(reloadTags)}
          onDelete={async (t) => {
            if (!confirm(`タグ「${t.name}」を削除しますか? (写真は残ります)`)) return
            await api.deleteTag(t.id)
            setFilter((f) => f.filter((x) => x !== t.id))
            await Promise.all([reloadTags(), reloadPhotos()])
          }}
        />
        <section className="calendar">
          {view === 'month' && (
            <MonthView
              cursor={cursor}
              today={today}
              photos={photos}
              tagsById={tagsById}
              onOpenPhoto={(p) => setOpenPhoto(p)}
              onOpenDay={openDay}
            />
          )}
          {view === 'week' && (
            <TimeGrid
              today={today}
              days={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))}
              photos={photos}
              tagsById={tagsById}
              thumbSize={56}
              onOpenPhoto={(p) => setOpenPhoto(p)}
              onOpenDay={openDay}
            />
          )}
          {view === 'day' && (
            <TimeGrid
              today={today}
              days={[cursor]}
              photos={photos}
              tagsById={tagsById}
              thumbSize={120}
              onOpenPhoto={(p) => setOpenPhoto(p)}
            />
          )}
        </section>
      </div>

      {openPhoto && (
        <PhotoModal
          key={openPhoto.id}
          photo={openPhoto}
          tags={tags}
          onClose={() => setOpenPhoto(null)}
          onUpdate={(patch) => updatePhoto(openPhoto.id, patch).catch((e) => setMessage(String(e)))}
          onCreateTag={createTag}
          onDelete={async () => {
            await api.deletePhoto(openPhoto.id)
            setOpenPhoto(null)
            await Promise.all([reloadPhotos(), reloadTags()])
          }}
        />
      )}

      {dragging && <div className="dropzone">ここにドロップして写真を追加</div>}
      {message && <div className="toast">{message}</div>}
    </div>
  )
}
