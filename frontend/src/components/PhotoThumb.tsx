import { formatTime, parseLocal } from '../dates'
import type { Photo, Tag } from '../types'

interface Props {
  photo: Photo
  tagsById: Map<string, Tag>
  size: number
  showTime?: boolean
  onOpen: (photo: Photo) => void
}

export function PhotoThumb({ photo, tagsById, size, showTime, onOpen }: Props) {
  const tags = photo.tagIds.map((id) => tagsById.get(id)).filter((t): t is Tag => t !== undefined)
  const time = formatTime(parseLocal(photo.takenAt))
  return (
    <button
      type="button"
      className="thumb"
      style={{ width: size, height: size, borderColor: tags[0]?.color ?? 'transparent' }}
      title={`${time} ${photo.title ?? photo.fileName}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(photo)
      }}
    >
      <img src={photo.url} alt={photo.title ?? photo.fileName} loading="lazy" />
      {showTime && <span className="thumb-time">{time}</span>}
      {tags.length > 0 && (
        <span className="thumb-tags">
          {tags.map((t) => (
            <span key={t.id} className="dot" style={{ background: t.color }} />
          ))}
        </span>
      )}
    </button>
  )
}
