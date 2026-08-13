import { formatBirthDate, formatBirthTime } from '../../utils/format'
import { trackClick } from '../../utils/analytics'
import { MASCOT_LINES } from '../mascot/mascotConfig'

export default function ReadingsList({
  isGuest,
  listLoading,
  listError,
  readings,
  selectedId,
  saving,
  onSelect,
  onDelete,
}) {
  return (
    <>
      {isGuest && (
        <div className="sidebar-empty-box">
          <p className="sidebar-empty">{MASCOT_LINES.guestSidebar}</p>
          <p className="sidebar-empty-hint">먼저 해석해 보고, 마음에 들면 로그인해서 저장하자!</p>
        </div>
      )}

      {!isGuest && listLoading && <p className="sidebar-empty">목록 불러오는 중… 조금만!</p>}
      {!isGuest && !listLoading && listError && <p className="sidebar-empty">{listError}</p>}
      {!isGuest && !listLoading && !listError && readings.length === 0 && (
        <div className="sidebar-empty-box">
          <p className="sidebar-empty">{MASCOT_LINES.empty}</p>
        </div>
      )}

      <ul className="sidebar-list">
        {readings.map((reading) => (
          <li key={reading.id} className="sidebar-item-row">
            <button
              type="button"
              className={
                selectedId === reading.id
                  ? 'sidebar-item sidebar-item--active'
                  : 'sidebar-item'
              }
              onClick={() => {
                trackClick('select_reading', { location: 'readings_list' })
                onSelect(reading)
              }}
            >
              <span className="sidebar-item-name">{reading.name}</span>
              <span className="sidebar-item-meta">
                {formatBirthDate(reading.birth_date)}
                {reading.birth_time ? ` · ${formatBirthTime(reading.birth_time)}` : ''}
              </span>
            </button>
            <button
              type="button"
              className="sidebar-item-delete"
              aria-label={`${reading.name} 기록 삭제`}
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation()
                trackClick('delete_reading', { location: 'readings_list' })
                onDelete(reading)
              }}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
