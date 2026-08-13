import { formatBirthDate, formatBirthTime } from '../../utils/format'
import { trackClick } from '../../utils/analytics'

export default function SidebarAuth({
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
}) {
  return (
    <div className="sidebar-auth">
      {authLoading ? (
        <p className="sidebar-auth-status">로그인 확인 중…</p>
      ) : user ? (
        <>
          <p className="sidebar-auth-user" title={user.email || userLabel}>
            {userLabel}
          </p>
          {profile && (
            <p className="sidebar-auth-meta">
              {formatBirthDate(profile.birth_date)}
              {profile.birth_time ? ` · ${formatBirthTime(profile.birth_time)}` : ''}
            </p>
          )}
          <button
            type="button"
            className="sidebar-auth-btn"
            onClick={() => {
              trackClick('open_profile', { location: 'sidebar_auth' })
              onOpenProfile()
            }}
            disabled={needsOnboarding || profileLoading}
          >
            프로필 수정
          </button>
          <button
            type="button"
            className="sidebar-auth-btn"
            onClick={() => {
              trackClick('sign_out', { location: 'sidebar_auth' })
              onSignOut()
            }}
          >
            로그아웃
          </button>
        </>
      ) : (
        <button
          type="button"
          className="sidebar-auth-btn sidebar-auth-btn--google"
          onClick={() => {
            trackClick('google_login', { location: 'sidebar_auth' })
            onGoogleLogin()
          }}
        >
          Google로 로그인
        </button>
      )}
      {authError && <p className="sidebar-auth-error">{authError}</p>}
    </div>
  )
}
