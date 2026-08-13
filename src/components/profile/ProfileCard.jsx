import { formatBirthDate, formatBirthTime, genderLabel, calendarLabel } from '../../utils/format'
import { trackClick } from '../../utils/analytics'

export default function ProfileCard({ profile, onEdit }) {
  if (!profile) return null

  return (
    <section className="profile-card" aria-label="내 프로필">
      <div className="profile-card-head">
        <div>
          <p className="profile-card-kicker">PROFILE</p>
          <h2>{profile.name}</h2>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            trackClick('open_profile', { location: 'profile_card' })
            onEdit()
          }}
        >
          프로필 수정
        </button>
      </div>
      <dl className="profile-card-meta">
        <div>
          <dt>생년월일</dt>
          <dd>{formatBirthDate(profile.birth_date)}</dd>
        </div>
        <div>
          <dt>시간</dt>
          <dd>{formatBirthTime(profile.birth_time)}</dd>
        </div>
        <div>
          <dt>성별</dt>
          <dd>{genderLabel(profile.gender)}</dd>
        </div>
        <div>
          <dt>달력</dt>
          <dd>{calendarLabel(profile.calendar_type)}</dd>
        </div>
      </dl>
    </section>
  )
}
