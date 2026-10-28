import { useEffect, useRef } from 'react'
import { dayKey, formatDate, isSameDay, parseLocal, WEEKDAYS } from '../dates'
import type { Photo, Tag } from '../types'
import { PhotoThumb } from './PhotoThumb'

interface Props {
  days: Date[]
  today: Date
  photos: Photo[]
  tagsById: Map<string, Tag>
  thumbSize: number
  onOpenPhoto: (photo: Photo) => void
  onOpenDay?: (day: Date) => void
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)

/** 日表示と週表示で共通の時間軸グリッド。写真は撮影した「時」の枠に並べる */
export function TimeGrid({ days, today, photos, tagsById, thumbSize, onOpenPhoto, onOpenDay }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const bySlot = Map.groupBy(photos, (p) => {
    const d = parseLocal(p.takenAt)
    return `${dayKey(d)}|${d.getHours()}`
  })
  const firstHour = Math.min(8, ...photos.map((p) => parseLocal(p.takenAt).getHours()))
  const firstDay = days[0]?.getTime()

  useEffect(() => {
    const row = scroller.current?.querySelector<HTMLElement>(`[data-hour="${firstHour}"]`)
    if (row && scroller.current) scroller.current.scrollTop = row.offsetTop - 8
  }, [firstHour, firstDay])

  const columns = `56px repeat(${days.length}, minmax(0, 1fr))`
  return (
    <div className="timegrid">
      <div className="timegrid-head" style={{ gridTemplateColumns: columns }}>
        <div />
        {days.map((d) => (
          <button
            type="button"
            key={dayKey(d)}
            className={`timegrid-day wd-${d.getDay()}${isSameDay(d, today) ? ' today' : ''}`}
            onClick={() => onOpenDay?.(d)}
            disabled={!onOpenDay}
          >
            {days.length === 1 ? (
              formatDate(d)
            ) : (
              <>
                <span className="wd">{WEEKDAYS[d.getDay()]}</span>
                <span className="day-num">{d.getDate()}</span>
              </>
            )}
          </button>
        ))}
      </div>
      <div className="timegrid-body" ref={scroller}>
        {HOURS.map((h) => (
          <div key={h} className="timegrid-row" data-hour={h} style={{ gridTemplateColumns: columns }}>
            <div className="hour-label">{h}:00</div>
            {days.map((d) => (
              <div key={dayKey(d)} className="timegrid-slot">
                {(bySlot.get(`${dayKey(d)}|${h}`) ?? []).map((p) => (
                  <PhotoThumb key={p.id} photo={p} tagsById={tagsById} size={thumbSize} showTime onOpen={onOpenPhoto} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
