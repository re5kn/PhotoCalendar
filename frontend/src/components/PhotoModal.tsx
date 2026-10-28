import { useEffect, useState } from 'react'
import { formatDate, formatTime, parseLocal } from '../dates'
import type { DateSource, Photo, Tag } from '../types'

interface Props {
  photo: Photo
  tags: Tag[]
  onClose: () => void
  onUpdate: (patch: { title?: string; takenAt?: string; tagIds?: string[] }) => void
  onCreateTag: (name: string) => Promise<Tag>
  onDelete: () => void
}

const SOURCE_LABELS: Record<DateSource, string> = {
  Exif: '画像のメタデータ (EXIF)',
  FileName: 'ファイル名',
  FileModified: 'ファイルの更新日時',
  Upload: 'アップロード日時',
  Manual: '手動で設定',
}

export function PhotoModal({ photo, tags, onClose, onUpdate, onCreateTag, onDelete }: Props) {
  const [title, setTitle] = useState(photo.title ?? '')
  const [takenAt, setTakenAt] = useState(photo.takenAt)
  const [newTag, setNewTag] = useState('')
  const taken = parseLocal(photo.takenAt)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleTag = (id: string) =>
    onUpdate({ tagIds: photo.tagIds.includes(id) ? photo.tagIds.filter((t) => t !== id) : [...photo.tagIds, id] })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-image">
          <img src={photo.url} alt={photo.title ?? photo.fileName} />
        </div>
        <div className="modal-side">
          <button type="button" className="close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
          <h3>
            {formatDate(taken)} {formatTime(taken)}
          </h3>
          <p className="muted">
            {photo.fileName}
            <br />
            日付の取得元: {SOURCE_LABELS[photo.dateSource]}
          </p>

          <label className="field">
            タイトル
            <input
              value={title}
              placeholder={photo.fileName}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== (photo.title ?? '') && onUpdate({ title })}
            />
          </label>

          <label className="field">
            日付時刻
            <input
              type="datetime-local"
              step={1}
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              onBlur={() => takenAt && takenAt !== photo.takenAt && onUpdate({ takenAt })}
            />
          </label>

          <div className="field">
            タグ
            <div className="chips">
              {tags.map((t) => {
                const on = photo.tagIds.includes(t.id)
                return (
                  <button
                    type="button"
                    key={t.id}
                    className={`chip${on ? ' on' : ''}`}
                    style={on ? { background: t.color, borderColor: t.color } : { borderColor: t.color, color: t.color }}
                    onClick={() => toggleTag(t.id)}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
            <form
              className="new-tag"
              onSubmit={async (e) => {
                e.preventDefault()
                const name = newTag.trim()
                if (!name) return
                setNewTag('')
                const tag = await onCreateTag(name)
                if (!photo.tagIds.includes(tag.id)) onUpdate({ tagIds: [...photo.tagIds, tag.id] })
              }}
            >
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="タグを作成して付ける" />
              <button type="submit">追加</button>
            </form>
          </div>

          <button
            type="button"
            className="danger wide"
            onClick={() => confirm('この写真を削除しますか?') && onDelete()}
          >
            写真を削除
          </button>
        </div>
      </div>
    </div>
  )
}
