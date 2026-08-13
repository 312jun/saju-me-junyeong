const GUEST_PENDING_KEY = 'saju_guest_pending'
export const GUEST_FREE_SECTIONS = 2

export function splitResultForTeaser(markdown, freeSectionCount = GUEST_FREE_SECTIONS) {
  if (!markdown) return { free: '', locked: '' }

  const parts = markdown.split(/(?=^## )/m).filter((part) => part.trim())
  if (parts.length > freeSectionCount) {
    return {
      free: parts.slice(0, freeSectionCount).join('').trim(),
      locked: parts.slice(freeSectionCount).join('').trim(),
    }
  }

  const cut = Math.max(220, Math.floor(markdown.length * 0.38))
  const breakAt = markdown.indexOf('\n', cut)
  const idx = breakAt > 0 ? breakAt : Math.min(cut, markdown.length)
  return {
    free: markdown.slice(0, idx).trim(),
    locked: markdown.slice(idx).trim(),
  }
}

export function readGuestPending() {
  try {
    const raw = sessionStorage.getItem(GUEST_PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.result) return null
    return parsed
  } catch {
    return null
  }
}

export function writeGuestPending(payload) {
  try {
    sessionStorage.setItem(GUEST_PENDING_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearGuestPending() {
  try {
    sessionStorage.removeItem(GUEST_PENDING_KEY)
  } catch {
    /* ignore */
  }
}
