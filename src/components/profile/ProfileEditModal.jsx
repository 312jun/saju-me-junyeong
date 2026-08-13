import { MASCOT_LINES } from '../mascot/mascotConfig'
import ProfileFields from './ProfileFields'
import { trackClick } from '../../utils/analytics'
import { isProfileComplete } from '../../utils/profile'

export default function ProfileEditModal({
  profileForm,
  setProfileForm,
  profileSaving,
  profileError,
  onClose,
  onSave,
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => !profileSaving && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-kicker">PROFILE</p>
        <h2 id="profile-edit-title">프로필 수정</h2>
        <p className="modal-lead">{MASCOT_LINES.profile}</p>

        <div className="modal-form">
          <ProfileFields
            idPrefix="profile"
            values={profileForm}
            onChange={setProfileForm}
            disabled={profileSaving}
          />
        </div>

        {profileError && <p className="modal-error">{profileError}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              trackClick('close_profile_modal', { location: 'profile_edit_modal' })
              onClose()
            }}
            disabled={profileSaving}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => {
              trackClick('save_profile', { location: 'profile_edit_modal' })
              onSave()
            }}
            disabled={profileSaving || !isProfileComplete(profileForm)}
          >
            {profileSaving ? '저장 중… 아하하!' : '프로필 저장!'}
          </button>
        </div>
      </div>
    </div>
  )
}
