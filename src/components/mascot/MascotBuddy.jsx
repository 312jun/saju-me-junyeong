import { createPortal } from 'react-dom'
import { MASCOT_LINES } from './mascotConfig'
import './MascotBuddy.css'

const MASCOT_SRC = '/assets/character-img.PNG'

export default function MascotBuddy({ mood = 'idle', compact = false }) {
  const line = MASCOT_LINES[mood] || MASCOT_LINES.idle

  if (typeof document === 'undefined') return null

  return createPortal(
    <aside
      className={compact ? 'mascot-buddy mascot-buddy--compact' : 'mascot-buddy'}
      aria-label="사주 마스코트"
    >
      <div className="mascot-bubble" key={mood}>
        <p className="mascot-bubble-name">사주밥</p>
        <p className="mascot-bubble-text">{line}</p>
      </div>
      <img
        className="mascot-img"
        src={MASCOT_SRC}
        alt="사주밥 마스코트"
        width={compact ? 88 : 120}
        height={compact ? 88 : 120}
        decoding="async"
      />
    </aside>,
    document.body
  )
}
