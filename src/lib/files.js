import { uid } from './format'

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

export function formatBytes(n) {
  const size = Number(n) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageFile(file) {
  const mime = file?.mime || file?.type || ''
  const name = String(file?.name || '').toLowerCase()
  return mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|bmp)$/.test(name)
}

function readOne(file, meta, userId) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error(`${file.name} is larger than 3 MB.`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const photo = isImageFile(file)
      resolve({
        id: uid('doc'),
        name: file.name,
        type: meta.type || (photo ? 'photo' : 'document'),
        kind: photo ? 'photo' : 'document',
        mime: file.type || 'application/octet-stream',
        size: formatBytes(file.size),
        bytes: file.size,
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString(),
        uploaderId: userId || '',
        stage: meta.stage || null,
        label: meta.label || '',
        mirrorStatus: 'local',
      })
    }
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export async function filesToRecords(fileList, meta, userId) {
  const files = Array.from(fileList || [])
  const records = []
  const errors = []
  for (const file of files) {
    try {
      records.push(await readOne(file, meta, userId))
    } catch (err) {
      errors.push(err.message)
    }
  }
  return { records, errors }
}
