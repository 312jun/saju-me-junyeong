import { forwardRef } from 'react'
import { MASCOT_LINES } from '../mascot/mascotConfig'
import { trackClick } from '../../utils/analytics'

const SajuForm = forwardRef(function SajuForm(
  {
    name,
    setName,
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    gender,
    setGender,
    calendarType,
    setCalendarType,
    filledCount,
    formReady,
    profile,
    selectedId,
    loading,
    saving,
    blockedByProfile,
    nameInputRef,
    onOpenProfile,
    onAnalyze,
    onUpdate,
    onDelete,
  },
  ref
) {
  return (
    <div className="form" ref={ref}>
      <div className="form-progress" aria-hidden="true">
        <div className="form-progress-track">
          <div
            className="form-progress-fill"
            style={{ width: `${(filledCount / 4) * 100}%` }}
          />
        </div>
        <p className="form-progress-text">
          {formReady ? MASCOT_LINES.ready : `필수 정보 ${filledCount}/4 …거의 다 왔어!`}
        </p>
      </div>

      <label htmlFor="name">
        이름
        <input
          id="name"
          ref={nameInputRef}
          type="text"
          placeholder="이름을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </label>

      <div className="form-row">
        <label htmlFor="birthDate">
          생년월일
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>

        <label htmlFor="birthTime">
          태어난 시간
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
          />
        </label>
      </div>

      <div className="form-row">
        <label htmlFor="gender">
          성별
          <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">선택하세요</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </label>

        <label htmlFor="calendarType">
          양력 / 음력
          <select
            id="calendarType"
            value={calendarType}
            onChange={(e) => setCalendarType(e.target.value)}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </label>
      </div>

      <p className="form-hint">
        {profile ? (
          <>
            기본값은 프로필입니다. 이번 해석만 다르게 보려면 여기서 수정하세요. 기본 정보는{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => {
                trackClick('open_profile', { location: 'saju_form' })
                onOpenProfile()
              }}
            >
              프로필
            </button>
            에서 바꿉니다.
          </>
        ) : (
          <>로그인 없이도 해석할 수 있어! 전체 결과·저장은 Google 로그인 후에 열려.</>
        )}
      </p>

      <button
        type="button"
        onClick={() => {
          trackClick(selectedId != null ? 'reanalyze' : 'analyze', { location: 'saju_form' })
          onAnalyze()
        }}
        disabled={loading || saving || blockedByProfile}
      >
        {loading
          ? '해석 중...'
          : selectedId != null
            ? '다시 해석하고 수정'
            : '사주 해석하기'}
      </button>

      {selectedId != null && (
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              trackClick('update_reading', { location: 'saju_form' })
              onUpdate()
            }}
            disabled={loading || saving}
          >
            {saving ? '저장 중...' : '정보 수정 저장'}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              trackClick('delete_reading', { location: 'saju_form' })
              onDelete()
            }}
            disabled={loading || saving}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  )
})

export default SajuForm
