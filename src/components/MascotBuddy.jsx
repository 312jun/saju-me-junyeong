import { createPortal } from 'react-dom'

const MASCOT_SRC = '/assets/character-img.PNG'

export const MASCOT_LINES = {
  gate: '아하하! 친구, Google로 로그인하면 바로 시작이야! 난 준비됐어!',
  locked: '아하하! 맛보기는 여기까지! 로그인하면 전체 해석이 열린다구!',
  onboarding: '자아~ 이름이랑 생일, 태어난 시간! 친구 정보가 필요해! 빨리빨리~!',
  loading: '명식을 읽는 중이야… 두구두구! 조금만 기다려 친구!',
  ready: '오오! 다 채웠다! 사주 해석하기 버튼만 누르면 된다구!',
  empty: '아직 기록이 하나도 없어! 오른쪽에서 첫 사주를 뽑아 보자고~!',
  result: '짜잔! 해석 완료! 어때, 멋지지 않아 친구?!',
  profile: '프로필 저장해 두면 다음엔 입력 없이 바로 간다구! 아하하!',
  idle: '생년월일만 알려줘! 로그인 없이도 먼저 맛볼 수 있어!',
  guestSidebar: '로그인하면 내 기록이 저장된다구! 그래도 먼저 해석해 봐!',
}

export function getMascotMood({
  needsOnboarding,
  loading,
  result,
  formReady,
  readingsCount,
  hasProfile,
  isGuest,
}) {
  if (needsOnboarding) return 'onboarding'
  if (loading) return 'loading'
  if (result && isGuest) return 'locked'
  if (result) return 'result'
  if (formReady) return 'ready'
  if (hasProfile && readingsCount === 0) return 'empty'
  if (hasProfile) return 'idle'
  return 'idle'
}

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
