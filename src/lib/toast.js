let listeners = []
let seq = 0

export function subscribeToast(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function toast(message, tone = 'success') {
  const item = { id: ++seq, message, tone }
  listeners.forEach((fn) => fn(item))
  return item
}
