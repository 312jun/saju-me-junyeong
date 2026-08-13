import { forwardRef } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  formatBirthDate,
  genderLabel,
  calendarLabel,
} from '../../utils/format'
import { MASCOT_LINES } from '../mascot/mascotConfig'
import { trackClick } from '../../utils/analytics'
import ShareControls from './ShareControls'

const ResultPanel = forwardRef(function ResultPanel(
  {
    name,
    birthDate,
    birthTime,
    gender,
    calendarType,
    result,
    setResult,
    selectedId,
    selectedReading,
    isGuest,
    showLockedResult,
    teaser,
    user,
    shareBusy,
    saving,
    shareMessage,
    shareUrl,
    onGoogleLogin,
    onEnableShare,
    onCopyShareLink,
    onDisableShare,
  },
  ref
) {
  return (
    <section
      ref={ref}
      className="result result--reveal"
      aria-label={`${name || '선택'} 사주 해석`}
    >
      <div className="result-header">
        <div>
          <p className="result-kicker">기본 차트 해석</p>
          <h2>{name || 'OOO'}님의 사주</h2>
        </div>
        {isGuest ? (
          <span className="result-badge result-badge--preview">미리보기</span>
        ) : selectedId != null ? (
          <span className="result-badge">
            {selectedReading?.is_shared ? '공유 중' : '저장됨'}
          </span>
        ) : null}
      </div>

      <dl className="result-meta">
        <div>
          <dt>생년월일</dt>
          <dd>{birthDate ? formatBirthDate(birthDate) : '-'}</dd>
        </div>
        <div>
          <dt>시간</dt>
          <dd>{birthTime || '-'}</dd>
        </div>
        <div>
          <dt>성별</dt>
          <dd>{genderLabel(gender)}</dd>
        </div>
        <div>
          <dt>달력</dt>
          <dd>{calendarLabel(calendarType)}</dd>
        </div>
      </dl>

      <div className="result-divider" aria-hidden="true">
        <span>釋</span>
      </div>

      <div className="result-body">
        <ReactMarkdown>{showLockedResult ? teaser.free : result}</ReactMarkdown>
      </div>

      {showLockedResult && (
        <div className="result-lock" aria-label="전체 결과 잠금">
          <div className="result-lock-preview" aria-hidden="true">
            <ReactMarkdown>{teaser.locked}</ReactMarkdown>
          </div>
          <div className="result-lock-overlay">
            <img
              className="result-lock-mascot"
              src="/assets/character-img.PNG"
              alt=""
              width={72}
              height={72}
            />
            <p className="result-lock-kicker">UNLOCK</p>
            <h3>여기부터는 로그인하면 열려!</h3>
            <p>{MASCOT_LINES.locked}</p>
            <ul className="result-lock-perks">
              <li>전체 해석 바로 열람</li>
              <li>내 사주 기록 저장</li>
              <li>다음에 프로필로 바로 해석</li>
            </ul>
            <button
              type="button"
              className="sidebar-auth-btn sidebar-auth-btn--google"
              onClick={() => {
                trackClick('google_login', { location: 'result_lock' })
                onGoogleLogin()
              }}
            >
              Google로 로그인하고 전체 보기
            </button>
          </div>
        </div>
      )}

      {selectedId != null && user && (
        <ShareControls
          selectedReading={selectedReading}
          shareBusy={shareBusy}
          saving={saving}
          shareMessage={shareMessage}
          shareUrl={shareUrl}
          onEnableShare={onEnableShare}
          onCopyShareLink={onCopyShareLink}
          onDisableShare={onDisableShare}
        />
      )}

      {selectedId != null && user && (
        <label className="result-edit" htmlFor="resultEdit">
          해석 내용 수정
          <textarea
            id="resultEdit"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={8}
          />
        </label>
      )}
    </section>
  )
})

export default ResultPanel
