export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const pad = (n: number) => String(n).padStart(2, '0')

/** Date をタイムゾーンなしのローカル時刻文字列にする */
export function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** タイムゾーンなしの ISO 文字列はローカル時刻として解釈される */
export const parseLocal = (s: string) => new Date(s)

export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export const startOfWeek = (d: Date) => addDays(startOfDay(d), -d.getDay())

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)

export const isSameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b)

export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export const formatDate = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`

/** 月表示は前後の週を含む 6 週間 (42 日) のグリッド */
export function monthGrid(d: Date): Date[] {
  const first = startOfWeek(startOfMonth(d))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}
