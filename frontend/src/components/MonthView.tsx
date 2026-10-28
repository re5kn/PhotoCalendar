import { dayKey, isSameDay, monthGrid, parseLocal, WEEKDAYS } from '../dates'
import type { Photo, Tag } from '../types'
import { PhotoThumb } from './PhotoThumb'

interface Props {
  cursor: Date
  today: Date
  photos: Photo[]
  tagsById: Map<string, Tag>
  onOpenPhoto: (photo: Photo) => void
  onOpenDay: (day: Date) => void
}

const MAX_PER_CELL = 4

export function MonthView({ cursor, today, photos, tagsById, onOpenPhoto, onOpenDay }: Props) {
  const byDay = Map.groupBy(photos, (p) => dayKey(parseLocal(p.takenAt)))
  return (
    <div className="month">
      {WEEKDAYS.map((w, i) => (
        <div key={w} className={`month-head wd-${i}`}>
          {w}
        </div>
      ))}
      {monthGrid(cursor).map((day) => {
        const items = byDay.get(dayKey(day)) ?? []
        const outside = day.getMonth() !== cursor.getMonth()
        return (
          <div
            key={dayKey(day)}
            className={`month-cell wd-${day.getDay()}${outside ? ' outside' : ''}`}
            onClick={() => onOpenDay(day)}
          >
            <span className={`day-num${isSameDay(day, today) ? ' today' : ''}`}>{day.getDate()}</span>
            <div className="month-photos">
              {items.slice(0, MAX_PER_CELL).map((p) => (
                <PhotoThumb key={p.id} photo={p} tagsById={tagsById} size={56} onOpen={onOpenPhoto} />
              ))}
              {items.length > MAX_PER_CELL && <span className="more">+{items.length - MAX_PER_CELL}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
