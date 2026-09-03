import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { formatBytes, filesToRecords, isImageFile } from '../lib/files'
import { formatDate } from '../lib/format'

export default function FileUpload({
  files = [],
  onAdd,
  onRemove,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.dwg,.dxf',
  type = 'document',
  stage,
  label = '',
  title = 'Photos & documents',
  hint = 'Images, PDF and office files up to 3 MB each.',
  compact = false,
  userId,
}) {
  const list = Array.isArray(files) ? files : []
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)

  const pick = async (fileList) => {
    if (!fileList?.length) return
    setBusy(true)
    setError('')
    const { records, errors } = await filesToRecords(fileList, { type, stage, label }, userId)
    if (errors.length) setError(errors.join(' '))
    if (records.length) onAdd?.(records)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`uploader ${compact ? 'compact' : ''}`}>
      {!compact && title ? <h3>{title}</h3> : null}
      {!compact && hint ? <p className="sub">{hint}</p> : null}
      <label
        className={`dropzone ${drag ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          pick(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          disabled={busy}
          onChange={(e) => pick(e.target.files)}
        />
        {!compact ? <UploadCloud className="drop-icon" size={22} strokeWidth={1.5} /> : null}
        <span>{busy ? 'Uploading…' : compact ? 'Upload photos or files' : 'Drop files here or click to upload photos and documents'}</span>
      </label>
      {error ? <div className="alert danger" style={{ marginTop: 8 }}>{error}</div> : null}
      {list.length ? (
        <div className="file-grid">
          {list.map((file) => (
            <div className="file-card" key={file.id}>
              {isImageFile(file) && file.dataUrl ? (
                <a href={file.dataUrl} target="_blank" rel="noreferrer" className="file-thumb">
                  <img src={file.dataUrl} alt={file.name} />
                </a>
              ) : (
                <div className="file-thumb file-doc">{(file.name || 'FILE').split('.').pop()?.toUpperCase()}</div>
              )}
              <div className="file-meta">
                {file.dataUrl ? (
                  <a href={file.dataUrl} download={file.name}>{file.name}</a>
                ) : <span>{file.name}</span>}
                <small>{file.size || formatBytes(file.bytes)} · {formatDate(file.uploadedAt, true)}</small>
              </div>
              {onRemove ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRemove(file.id)}>Remove</button>
              ) : null}
            </div>
          ))}
        </div>
      ) : compact ? null : <p className="lede" style={{ marginTop: 8 }}>No files attached yet.</p>}
    </div>
  )
}
