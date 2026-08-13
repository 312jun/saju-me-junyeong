import { trackClick } from '../../utils/analytics'

export default function AppHeader({ profile, needsOnboarding, user, onNewReading }) {
  return (
    <>
      <p className="brand-eyebrow">四柱 · 命理</p>

      <div className="app-head">
        <div>
          <h1>사주 해석</h1>
          <p className="app-head-sub">
            {profile
              ? '친구, 저장된 프로필로 바로 해석할 수 있다구!'
              : '로그인 없이 먼저 해석해 봐! 전체 결과와 저장은 로그인하면 열려.'}
          </p>
        </div>
        <button
          type="button"
          className="new-reading-btn"
          onClick={() => {
            trackClick('new_reading', { location: 'header' })
            onNewReading()
          }}
          disabled={Boolean(user && needsOnboarding)}
        >
          새 해석 시작
        </button>
      </div>
    </>
  )
}
