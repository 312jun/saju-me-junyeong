import { MASCOT_LINES } from '../mascot/mascotConfig'
import ProfileFields from './ProfileFields'
import { trackClick } from '../../utils/analytics'
import { isProfileComplete } from '../../utils/profile'

export default function OnboardingModal({
  profileForm,
  setProfileForm,
  profileSaving,
  profileError,
  onSave,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <p className="modal-kicker">I'M READY!</p>
        <h2 id="onboarding-title">자아, 프로필 만들 시간이야!</h2>
        <p className="modal-lead">{MASCOT_LINES.onboarding}</p>

        <div className="modal-mascot-row" aria-hidden="true">
          <img src="/assets/character-img.PNG" alt="" width={72} height={72} />
        </div>

        <div className="modal-form">
          <ProfileFields
            idPrefix="onboarding"
            values={profileForm}
            onChange={setProfileForm}
            disabled={profileSaving}
          />
        </div>

        {profileError && <p className="modal-error">{profileError}</p>}

        <button
          type="button"
          onClick={() => {
            trackClick('save_onboarding_profile', { location: 'onboarding_modal' })
            onSave({ asOnboarding: true })
          }}
          disabled={profileSaving || !isProfileComplete(profileForm)}
        >
          {profileSaving ? '저장 중… 두구두구!' : '프로필 저장하고 출발!'}
        </button>
      </div>
    </div>
  )
}
