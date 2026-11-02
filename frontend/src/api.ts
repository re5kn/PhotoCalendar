import { toLocalIso } from './dates'
import type { Photo, Tag } from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.status === 204 ? (undefined as T) : res.json()
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const api = {
  listPhotos: (from: Date, to: Date, tagIds: string[]) => {
    const q = new URLSearchParams({ from: toLocalIso(from), to: toLocalIso(to) })
    if (tagIds.length > 0) q.set('tags', tagIds.join(','))
    return fetch(`/api/photos?${q}`).then(json<Photo[]>)
  },

  uploadPhotos: (files: File[]) => {
    const form = new FormData()
    for (const f of files) {
      form.append('files', f)
      // EXIF もファイル名の日付もない画像のために、ファイルの更新日時を一緒に送る
      form.append('lastModified', toLocalIso(new Date(f.lastModified)))
    }
    return fetch('/api/photos', { method: 'POST', body: form }).then(json<Photo[]>)
  },

  updatePhoto: (id: string, patch: { title?: string; takenAt?: string; tagIds?: string[] }) =>
    fetch(`/api/photos/${id}`, send('PATCH', patch)).then(json<Photo>),

  deletePhoto: (id: string) => fetch(`/api/photos/${id}`, send('DELETE')).then(json<void>),

  listTags: () => fetch('/api/tags').then(json<Tag[]>),

  createTag: (name: string) => fetch('/api/tags', send('POST', { name })).then(json<Tag>),

  updateTag: (id: string, patch: { name?: string; color?: string }) =>
    fetch(`/api/tags/${id}`, send('PATCH', patch)).then(json<Tag>),

  deleteTag: (id: string) => fetch(`/api/tags/${id}`, send('DELETE')).then(json<void>),
}
