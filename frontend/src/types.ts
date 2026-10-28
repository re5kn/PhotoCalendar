export type DateSource = 'Exif' | 'FileName' | 'FileModified' | 'Upload' | 'Manual'

export interface Photo {
  id: string
  fileName: string
  title: string | null
  /** タイムゾーンなしのローカル時刻 (yyyy-MM-ddTHH:mm:ss) */
  takenAt: string
  dateSource: DateSource
  uploadedAt: string
  tagIds: string[]
  url: string
}

export interface Tag {
  id: string
  name: string
  color: string
  photoCount: number
  icsUrl: string
}

export type ViewMode = 'day' | 'week' | 'month'
