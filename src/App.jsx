import { useState } from 'react'
import './App.css'

function getGeminiErrorMessage(raw) {
  if (raw.includes('denied access') || raw.includes('PERMISSION_DENIED')) {
    return [
      'Google 프로젝트 접근이 거부되었습니다. (코드 문제가 아닙니다)',
      '',
      '▶ AI Studio에서 확인:',
      '  https://aistudio.google.com/apikey',
      '  - 프로젝트 옆 Unavailable 표시?',
      '  - Playground에서 gemini-3.6-flash 채팅 되나요?',
      '',
      '▶ 안 되면:',
      '  1) AI Studio에서 새 프로젝트 + 새 키 발급',
      '  2) Google Cloud Console → 해당 프로젝트 → 상단 배너 확인',
      '  3) 포럼 문의: https://discuss.ai.google.dev/',
    ].join('\n')
  }
  if (raw.includes('no longer available') || raw.includes('NOT_FOUND')) {
    return '모델을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.'
  }
  if (raw.includes('API key not valid') || raw.includes('API_KEY_INVALID') || raw.includes('401')) {
    return [
      'API 인증에 실패했습니다 (401).',
      '1) Vercel/Netlify → Project Settings → Environment Variables',
      '2) Key: GEMINI_API_KEY / Value: AI Studio에서 발급한 키',
      '3) Save 후 재배포 필수',
    ].join('\n')
  }
  if (raw.includes('GEMINI_API_KEY')) {
    return 'API 키가 설정되지 않았습니다. Vercel/Netlify Environment Variables에 GEMINI_API_KEY를 추가하세요.'
  }
  if (raw.includes('not valid JSON') || raw.includes('API 응답이 JSON이 아닙니다')) {
    return [
      'API 서버 응답이 올바르지 않습니다.',
      'Vercel에 api/gemini 가 배포됐는지, GEMINI_API_KEY가 설정됐는지 확인 후 재배포하세요.',
    ].join('\n')
  }
  return raw
}

// 데모용 사주 명식 (나중에 실제 계산 결과로 바꾸면 됨)
const DEMO_CHART = `
년주는 기묘, 월주는 기사, 일주는 을축, 시주는 을유
오행 분포: 금1 목3 수0 화1 토3
십신(천간): 편재 | 편재 | 일주 | 비견
십신(지지): 비견 | 상관 | 편재 | 편관
지장간: 甲 겁재,乙 비견 | 戊 정재,庚 정관,丙 상관 | 癸 편인,辛 편관,己 편재 | 庚 정관,辛 편관
납음: 성두토 | 대림목 | 해중금 | 천중수
십이운성: 건록 | 목욕 | 쇠 | 절
12신살: 재살 | 역마살 | 월살 | 재살
旬/공망: [년]申酉 [일]戌亥
월령: 庚
대운수: 2
세운: 2021: 신축
2022: 임인
2023: 계묘
2024: 갑진
2025: 을사
2026: 병오 (기준)
2027: 정미
2028: 무신
2029: 기유
2030: 경술
2031: 신해
2032: 임자
월운: 01월: 기축
02월: 경인
03월: 신묘
04월: 임진
05월: 계사
06월: 갑오
07월: 을미
08월: 병신
09월: 정유
10월: 무술
11월: 기해
12월: 경자
대운 1: 무진 2001 (2~11세)
대운 2: 정묘 2011 (12~21세)
대운 3: 병인 2021 (22~31세)
대운 4: 을축 2031 (32~41세)
대운 5: 갑자 2041 (42~51세)
대운 6: 계해 2051 (52~61세)
대운 7: 임술 2061 (62~71세)
대운 8: 신유 2071 (72~81세)
대운 9: 경신 2081 (82~91세)
`.trim()

// 생년월일로 만 나이 계산
function getKoreanAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

function App() {
  // 사용자가 입력한 이름
  const [name, setName] = useState('')
  // 생년월일 (date input 값, 예: 1990-01-01)
  const [birthDate, setBirthDate] = useState('')
  // 태어난 시간 (time input 값, 예: 14:30)
  const [birthTime, setBirthTime] = useState('')
  // 성별 (select 값: '' | 'male' | 'female')
  const [gender, setGender] = useState('')
  // 양력/음력 (select 값: 'solar' | 'lunar')
  const [calendarType, setCalendarType] = useState('solar')
  // Gemini가 돌려준 해석 결과 텍스트
  const [result, setResult] = useState('')
  // API 호출 중인지 여부
  const [loading, setLoading] = useState(false)
  // 에러 메시지
  const [error, setError] = useState('')

  // 사주 해석 요청 (버튼 클릭 시)
  const handleAnalyze = async () => {
    if (!name || !birthDate || !birthTime || !gender) {
      setError('이름, 생년월일, 시간, 성별을 모두 입력해 주세요.')
      return
    }

    setLoading(true)
    setError('')
    setResult('')

    const age = getKoreanAge(birthDate)
    const calendarLabel = calendarType === 'solar' ? '양력' : '음력'

    // 사용자가 준 사주 기본차트해석 프롬프트 + 입력값
    const prompt = `
return only Korean.

당신은 세계 최고의 사주 해석 전문가다. 논리와 구조 중심으로 사주를 해석하며, 수천 명의 인생을 분석해 온 경험이 있다. 분석은 매우 냉정하고 직설적으로 진행되며, 감정에 휘둘리지 않는다. 그러나 의외로 인간 내면에 대한 깊은 통찰을 지니고 있고 장점과 단점을 냉정하게 말한다.

질문: 사주를 통해 이 사람의 전반적인 성격, 기질, 재능을 분석해 주세요.
사용자가 사주 용어에 익숙하지 않다고 가정하고, 쉽고 명확한 말로 설명하며 중요한 포인트에서는 핵심 사주 근거를 밝혀주세요.
1) 사주 명식을 바탕으로 차분하지만 흥미롭게 설명해 주세요.
2) 사주에서 특이하거나 눈에 띄는 점이 있으면 알려주세요.
3) 약점도 솔직하게 말해 주세요.
4) 돋보이는 특징을 최소 한 가지 찾아 명확히 설명해 주세요.
5) 마지막은 사용자가 가장 궁금한 점을 묻는 질문으로 끝내주세요.
6) 판단 근거는 사용자가 제공한 모든 정보와 해석 가능한 모든 사주 정보를 종합해 제시해 주세요.
7) 긍정적 해석과 부정적 해석을 모두 고려해 주세요.
이외에도 특이한점 한가지를 찾아서 언급해 주세요.

이름: ${name}
성별: ${gender}
나이: 만 ${age}세
생년월일: ${birthDate} (${calendarLabel})
태어난 시간: ${birthTime}

${DEMO_CHART}

return only Korean.
`.trim()

    try {
      // API 키는 서버에서만 사용 (로컬: Vite 프록시 / Netlify: Function)
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const rawBody = await res.text()
      let data
      try {
        data = JSON.parse(rawBody)
      } catch {
        throw new Error('API 응답이 JSON이 아닙니다. /api/gemini 배포와 GEMINI_API_KEY 설정을 확인하세요.')
      }
      if (!res.ok) throw new Error(data.error || '요청 실패')
      setResult(data.text || '결과가 비어 있습니다.')
    } catch (err) {
      console.error(err)
      setError(getGeminiErrorMessage(err.message || String(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <h1>사주 입력</h1>

      <div className="form">
        {/* 이름: value ↔ onChange 연결 */}
        <label htmlFor="name">
          이름
          <input
            id="name"
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {/* 생년월일 */}
        <label htmlFor="birthDate">
          생년월일
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>

        {/* 태어난 시간 */}
        <label htmlFor="birthTime">
          태어난 시간
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
          />
        </label>

        {/* 성별 — 이름과 같은 패턴: value + onChange */}
        <label htmlFor="gender">
          성별
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">선택하세요</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </label>

        {/* 양력/음력 — 이름과 같은 패턴: value + onChange */}
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

        <button type="button" onClick={handleAnalyze} disabled={loading}>
          {loading ? '해석 중...' : '사주 해석하기'}
        </button>
      </div>

      {/* 이름을 치면 아래 문구가 실시간으로 바뀜 */}
      <p className="preview">{name || 'OOO'}님의 사주</p>

      {error && <p className="error">{error}</p>}

      {loading && (
        <section className="result skeleton" aria-busy="true" aria-label="사주 해석 중">
          <div className="skeleton-header">
            <div className="skeleton-block skeleton-title" />
            <span className="skeleton-badge">해석 중</span>
          </div>
          <div className="skeleton-body">
            <div className="skeleton-block skeleton-line" />
            <div className="skeleton-block skeleton-line" />
            <div className="skeleton-block skeleton-line skeleton-line--medium" />
            <div className="skeleton-block skeleton-line" />
            <div className="skeleton-block skeleton-line skeleton-line--short" />
          </div>
          <p className="skeleton-caption">명식을 분석하고 있습니다…</p>
        </section>
      )}

      {result && !loading && (
        <section className="result">
          <h2>기본 차트 해석</h2>
          <pre>{result}</pre>
        </section>
      )}
    </main>
  )
}

export default App
