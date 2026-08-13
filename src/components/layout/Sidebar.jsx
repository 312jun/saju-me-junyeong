import SidebarAuth from '../auth/SidebarAuth'
import ReadingsList from '../readings/ReadingsList'
import { trackClick } from '../../utils/analytics'

export default function Sidebar({
  authLoading,
  user,
  userLabel,
  profile,
  needsOnboarding,
  profileLoading,
  authError,
  onOpenProfile,
  onSignOut,
  onGoogleLogin,
  readings,
  selectedId,
  listLoading,
  listError,
  saving,
  isGuest,
  onNewReading,
  onSelectReading,
  onDeleteReading,
}) {
  return (
    <aside className="sidebar" aria-label="저장된 사주 목록">
      <div className="sidebar-brand">
        <img
          className="sidebar-brand-mascot"
          src="/assets/character-img.PNG"
          alt=""
          width={40}
          height={40}
          aria-hidden="true"
        />
        <span className="sidebar-brand-text">사주명식</span>
      </div>

      <SidebarAuth
        authLoading={authLoading}
        user={user}
        userLabel={userLabel}
        profile={profile}
        needsOnboarding={needsOnboarding}
        profileLoading={profileLoading}
        authError={authError}
        onOpenProfile={onOpenProfile}
        onSignOut={onSignOut}
        onGoogleLogin={onGoogleLogin}
      />

      <div className="sidebar-head">
        <div className="sidebar-title-row">
          <h2 className="sidebar-title">내 사주 기록</h2>
          <span className="sidebar-count">{readings.length}</span>
        </div>
        <button
          type="button"
          className="sidebar-new"
          onClick={() => {
            trackClick('new_reading', { location: 'sidebar' })
            onNewReading()
          }}
          disabled={Boolean(user && needsOnboarding)}
        >
          새 해석 시작
        </button>
      </div>

      <ReadingsList
        isGuest={isGuest}
        listLoading={listLoading}
        listError={listError}
        readings={readings}
        selectedId={selectedId}
        saving={saving}
        onSelect={onSelectReading}
        onDelete={onDeleteReading}
      />
    </aside>
  )
}
