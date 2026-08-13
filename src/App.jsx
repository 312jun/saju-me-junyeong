import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import MascotBuddy, { getMascotMood, MASCOT_LINES } from './components/MascotBuddy'
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

const EMPTY_PROFILE_FORM = {
  name: '',
  birthDate: '',
  birthTime: '',
  gender: '',
  calendarType: 'solar',
}

const READING_SELECT =
  'id, name, birth_date, birth_time, gender, calendar_type, result, created_at, user_id, share_token, is_shared, shared_at'

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

function genderLabel(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return value || '-'
}

function calendarLabel(value) {
  return value === 'lunar' ? '음력' : '양력'
}

function formatBirthDate(value) {
  if (!value) return ''
  const [y, m, d] = String(value).split('-')
  if (!y || !m || !d) return value
  return `${y}.${m}.${d}`
}

function formatBirthTime(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function profileToForm(profile) {
  if (!profile) return { ...EMPTY_PROFILE_FORM }
  return {
    name: profile.name || '',
    birthDate: profile.birth_date || '',
    birthTime: formatBirthTime(profile.birth_time),
    gender: profile.gender || '',
    calendarType: profile.calendar_type || 'solar',
  }
}

function isProfileComplete(form) {
  return Boolean(form.name && form.birthDate && form.birthTime && form.gender && form.calendarType)
}

const GUEST_PENDING_KEY = 'saju_guest_pending'
const GUEST_FREE_SECTIONS = 2

function splitResultForTeaser(markdown, freeSectionCount = GUEST_FREE_SECTIONS) {
  if (!markdown) return { free: '', locked: '' }

  const parts = markdown.split(/(?=^## )/m).filter((part) => part.trim())
  if (parts.length > freeSectionCount) {
    return {
      free: parts.slice(0, freeSectionCount).join('').trim(),
      locked: parts.slice(freeSectionCount).join('').trim(),
    }
  }

  const cut = Math.max(220, Math.floor(markdown.length * 0.38))
  const breakAt = markdown.indexOf('\n', cut)
  const idx = breakAt > 0 ? breakAt : Math.min(cut, markdown.length)
  return {
    free: markdown.slice(0, idx).trim(),
    locked: markdown.slice(idx).trim(),
  }
}

function readGuestPending() {
  try {
    const raw = sessionStorage.getItem(GUEST_PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.result) return null
    return parsed
  } catch {
    return null
  }
}

function writeGuestPending(payload) {
  try {
    sessionStorage.setItem(GUEST_PENDING_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

function clearGuestPending() {
  try {
    sessionStorage.removeItem(GUEST_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

function ProfileFields({ idPrefix, values, onChange, disabled }) {
  return (
    <>
      <label htmlFor={`${idPrefix}-name`}>
        이름
        <input
          id={`${idPrefix}-name`}
          type="text"
          placeholder="이름을 입력하세요"
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          autoComplete="name"
          disabled={disabled}
          required
        />
      </label>

      <div className="form-row">
        <label htmlFor={`${idPrefix}-birthDate`}>
          생년월일
          <input
            id={`${idPrefix}-birthDate`}
            type="date"
            value={values.birthDate}
            onChange={(e) => onChange({ ...values, birthDate: e.target.value })}
            disabled={disabled}
            required
          />
        </label>

        <label htmlFor={`${idPrefix}-birthTime`}>
          태어난 시간
          <input
            id={`${idPrefix}-birthTime`}
            type="time"
            value={values.birthTime}
            onChange={(e) => onChange({ ...values, birthTime: e.target.value })}
            disabled={disabled}
            required
          />
        </label>
      </div>

      <div className="form-row">
        <label htmlFor={`${idPrefix}-gender`}>
          성별
          <select
            id={`${idPrefix}-gender`}
            value={values.gender}
            onChange={(e) => onChange({ ...values, gender: e.target.value })}
            disabled={disabled}
            required
          >
            <option value="">선택하세요</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </label>

        <label htmlFor={`${idPrefix}-calendarType`}>
          양력 / 음력
          <select
            id={`${idPrefix}-calendarType`}
            value={values.calendarType}
            onChange={(e) => onChange({ ...values, calendarType: e.target.value })}
            disabled={disabled}
            required
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </label>
      </div>
    </>
  )
}

function App() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mascotAway, setMascotAway] = useState(false)
  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [listError, setListError] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM)
  const resultRef = useRef(null)
  const formRef = useRef(null)
  const nameInputRef = useRef(null)
  const errorRef = useRef(null)
  const guestClaimedRef = useRef(false)

  const filledCount = [name, birthDate, birthTime, gender].filter(Boolean).length
  const formReady = filledCount === 4
  const age = getKoreanAge(birthDate)
  const isGuest = !user
  const userLabel =
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    ''
  const teaser = !user && result ? splitResultForTeaser(result) : null
  const showLockedResult = Boolean(teaser?.locked)

  const applyFormValues = (values) => {
    setName(values.name || '')
    setBirthDate(values.birthDate || '')
    setBirthTime(values.birthTime || '')
    setGender(values.gender || '')
    setCalendarType(values.calendarType || 'solar')
  }

  const scrollToResult = () => {
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const loadReadings = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setListError('Supabase 환경변수가 없습니다. .env 저장 후 dev 서버를 재시작하세요.')
      setListLoading(false)
      setReadings([])
      return
    }

    if (!user) {
      setReadings([])
      setListError('')
      setListLoading(false)
      return
    }

    setListLoading(true)
    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select(READING_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error(fetchError)
      setListError('저장된 목록을 불러오지 못했습니다.')
      setListLoading(false)
      return
    }

    setListError('')
    setReadings(data ?? [])
    setListLoading(false)
  }

  const loadProfile = async (authUser) => {
    if (!isSupabaseConfigured || !supabase || !authUser) {
      setProfile(null)
      setNeedsOnboarding(false)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    setProfileError('')

    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at')
      .eq('id', authUser.id)
      .maybeSingle()

    if (fetchError) {
      console.error(fetchError)
      setProfileError('프로필을 불러오지 못했습니다.')
      setProfile(null)
      setNeedsOnboarding(false)
      setProfileLoading(false)
      return
    }

    if (!data) {
      setProfile(null)
      setNeedsOnboarding(true)
      setProfileForm({
        ...EMPTY_PROFILE_FORM,
        name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          '',
      })
      setProfileLoading(false)
      return
    }

    const formValues = profileToForm(data)
    setProfile(data)
    setNeedsOnboarding(false)
    setProfileForm(formValues)
    applyFormValues(formValues)
    setProfileLoading(false)
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false)
      return
    }

    let active = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        console.error(sessionError)
        setAuthError('로그인 상태를 확인하지 못했습니다.')
      }
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthError('')
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setProfile(null)
      setNeedsOnboarding(false)
      setProfileOpen(false)
      setProfileForm(EMPTY_PROFILE_FORM)
      setReadings([])
      setSelectedId(null)
      setListLoading(false)
      setListError('')
      return
    }

    loadProfile(user)
  }, [user, authLoading])

  useEffect(() => {
    if (authLoading) return
    loadReadings()
  }, [user, authLoading])

  useEffect(() => {
    if (authLoading || user) return
    const pending = readGuestPending()
    if (!pending?.result) return
    applyFormValues({
      name: pending.name || '',
      birthDate: pending.birthDate || '',
      birthTime: pending.birthTime || '',
      gender: pending.gender || '',
      calendarType: pending.calendarType || 'solar',
    })
    setResult(pending.result)
    setMascotAway(true)
  }, [authLoading, user])

  useEffect(() => {
    if (authLoading || !user) return
    const pending = readGuestPending()
    if (!pending?.result) return
    applyFormValues({
      name: pending.name || '',
      birthDate: pending.birthDate || '',
      birthTime: pending.birthTime || '',
      gender: pending.gender || '',
      calendarType: pending.calendarType || 'solar',
    })
    setResult(pending.result)
    setMascotAway(true)
  }, [authLoading, user])

  useEffect(() => {
    if (authLoading || !user || !profile || guestClaimedRef.current) return

    const pending = readGuestPending()
    if (!pending?.result) return

    guestClaimedRef.current = true
    setError('')

    const claim = async () => {
      if (!isSupabaseConfigured || !supabase) {
        clearGuestPending()
        return
      }

      setSaving(true)
      const payload = {
        name: pending.name || profile.name,
        birth_date: pending.birthDate || profile.birth_date,
        birth_time: pending.birthTime || profile.birth_time,
        gender: pending.gender || profile.gender,
        calendar_type: pending.calendarType || profile.calendar_type || 'solar',
        result: pending.result,
        user_id: user.id,
      }

      const { data: saved, error: saveError } = await supabase
        .from('saju_readings')
        .insert(payload)
        .select(READING_SELECT)
        .single()

      setSaving(false)

      if (saveError) {
        console.error(saveError)
        setError('로그인 후 결과 저장에 실패했습니다. 다시 해석해 주세요.')
        guestClaimedRef.current = false
        return
      }

      clearGuestPending()
      if (saved) {
        setSelectedId(saved.id)
        setReadings((prev) => [saved, ...prev])
        setTimeout(scrollToResult, 50)
      }
    }

    claim()
  }, [authLoading, user, profile])

  useEffect(() => {
    if (error) {
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [error])

  useEffect(() => {
    if (loading) {
      setMascotAway(false)
      const timer = setTimeout(() => setMascotAway(true), 1600)
      return () => clearTimeout(timer)
    }
    if (result) {
      setMascotAway(true)
    }
  }, [loading, result])

  const persistGuestDraft = (resultText = result) => {
    if (!resultText) return
    writeGuestPending({
      name,
      birthDate,
      birthTime,
      gender,
      calendarType,
      result: resultText,
    })
  }

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthError('Supabase 환경변수가 없습니다. .env를 확인하세요.')
      return
    }

    if (result) {
      persistGuestDraft(result)
    }

    setAuthError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (oauthError) {
      console.error(oauthError)
      setAuthError('Google 로그인을 시작하지 못했습니다.')
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return

    setAuthError('')
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error(signOutError)
      setAuthError('로그아웃에 실패했습니다.')
      return
    }

    setProfile(null)
    setNeedsOnboarding(false)
    setProfileOpen(false)
    applyFormValues(EMPTY_PROFILE_FORM)
    setResult('')
    setShareMessage('')
    setSelectedId(null)
    setReadings([])
    clearGuestPending()
    guestClaimedRef.current = false
  }

  const saveProfile = async ({ asOnboarding = false } = {}) => {
    if (!user || !supabase) {
      setProfileError('로그인이 필요합니다.')
      return false
    }
    if (!isProfileComplete(profileForm)) {
      setProfileError('이름, 생년월일, 시간, 성별을 모두 입력해 주세요.')
      return false
    }

    setProfileSaving(true)
    setProfileError('')

    const payload = {
      id: user.id,
      name: profileForm.name.trim(),
      birth_date: profileForm.birthDate,
      birth_time: profileForm.birthTime,
      gender: profileForm.gender,
      calendar_type: profileForm.calendarType,
      updated_at: new Date().toISOString(),
    }

    const { data, error: upsertError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at')
      .single()

    setProfileSaving(false)

    if (upsertError) {
      console.error(upsertError)
      setProfileError(asOnboarding ? '프로필 저장에 실패했습니다.' : '프로필 수정에 실패했습니다.')
      return false
    }

    const formValues = profileToForm(data)
    setProfile(data)
    setNeedsOnboarding(false)
    setProfileOpen(false)
    setProfileForm(formValues)
    applyFormValues(formValues)
    setError('')
    return true
  }

  const openProfileEditor = () => {
    setProfileForm(profile ? profileToForm(profile) : { ...EMPTY_PROFILE_FORM })
    setProfileError('')
    setProfileOpen(true)
  }

  const handleSelectReading = (reading) => {
    setSelectedId(reading.id)
    setName(reading.name)
    setBirthDate(reading.birth_date)
    setBirthTime(formatBirthTime(reading.birth_time))
    setGender(reading.gender)
    setCalendarType(reading.calendar_type)
    setResult(reading.result)
    setError('')
    setShareMessage('')
    setLoading(false)
    scrollToResult()
  }

  const handleNewReading = () => {
    setSelectedId(null)
    setResult('')
    setError('')
    setShareMessage('')
    setLoading(false)
    setSaving(false)
    setMascotAway(false)
    clearGuestPending()
    applyFormValues(EMPTY_PROFILE_FORM)

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
    })
  }

  const buildReadingPayload = (resultText) => ({
    name,
    birth_date: birthDate,
    birth_time: birthTime,
    gender,
    calendar_type: calendarType,
    result: resultText,
    user_id: user?.id ?? null,
  })

  const handleUpdate = async () => {
    if (!user) {
      setError('로그인한 뒤에 수정할 수 있습니다.')
      return
    }
    if (selectedId == null) {
      setError('수정할 사주를 먼저 선택해 주세요.')
      return
    }
    if (!name || !birthDate || !birthTime || !gender) {
      setError('이름, 생년월일, 시간, 성별을 모두 입력해 주세요.')
      return
    }
    if (!result) {
      setError('저장할 해석 결과가 없습니다. 먼저 사주를 해석해 주세요.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase 환경변수가 없어 수정할 수 없습니다.')
      return
    }

    setSaving(true)
    setError('')

    const { data: updated, error: updateError } = await supabase
      .from('saju_readings')
      .update(buildReadingPayload(result))
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .select(READING_SELECT)
      .single()

    setSaving(false)

    if (updateError) {
      console.error(updateError)
      setError('사주 정보 수정에 실패했습니다.')
      return
    }

    setReadings((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    )
  }

  const handleDelete = async (reading) => {
    if (!user) {
      setError('로그인한 뒤에 삭제할 수 있습니다.')
      return
    }

    const targetId = reading?.id ?? selectedId
    const targetName = reading?.name ?? name

    if (targetId == null) {
      setError('삭제할 사주를 먼저 선택해 주세요.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase 환경변수가 없어 삭제할 수 없습니다.')
      return
    }

    const confirmed = window.confirm(`「${targetName || '선택'}」 사주를 삭제할까요?`)
    if (!confirmed) return

    setSaving(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', targetId)
      .eq('user_id', user.id)

    setSaving(false)

    if (deleteError) {
      console.error(deleteError)
      setError('사주 삭제에 실패했습니다.')
      return
    }

    setReadings((prev) => prev.filter((item) => item.id !== targetId))
    if (selectedId === targetId) {
      handleNewReading()
    }
  }

  const selectedReading =
    selectedId == null ? null : readings.find((item) => item.id === selectedId) ?? null

  const getShareUrl = (token) => `${window.location.origin}/result/${token}`

  const copyShareLink = async (token) => {
    const url = getShareUrl(token)
    try {
      await navigator.clipboard.writeText(url)
      setShareMessage('공유 링크를 복사했어요! 친구에게 보내 보세요.')
      return true
    } catch (copyError) {
      console.error(copyError)
      setShareMessage(`링크: ${url}`)
      return false
    }
  }

  const handleEnableShare = async () => {
    if (!user || selectedId == null) {
      setError('저장된 사주를 선택한 뒤 공유할 수 있습니다.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase 환경변수가 없어 공유할 수 없습니다.')
      return
    }

    setShareBusy(true)
    setError('')
    setShareMessage('')

    const { data: updated, error: shareError } = await supabase
      .from('saju_readings')
      .update({
        is_shared: true,
        shared_at: new Date().toISOString(),
      })
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .select(READING_SELECT)
      .single()

    setShareBusy(false)

    if (shareError || !updated?.share_token) {
      console.error(shareError)
      setError('공유 링크 만들기에 실패했습니다.')
      return
    }

    setReadings((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    )
    await copyShareLink(updated.share_token)
  }

  const handleCopyShareLink = async () => {
    const token = selectedReading?.share_token
    if (!token || !selectedReading?.is_shared) {
      setError('먼저 공유 링크를 만들어 주세요.')
      return
    }
    setError('')
    await copyShareLink(token)
  }

  const handleDisableShare = async () => {
    if (!user || selectedId == null) return
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase 환경변수가 없어 공유를 끌 수 없습니다.')
      return
    }

    const confirmed = window.confirm('공유를 중지할까요? 기존 링크로는 더 이상 볼 수 없어요.')
    if (!confirmed) return

    setShareBusy(true)
    setError('')
    setShareMessage('')

    const { data: updated, error: shareError } = await supabase
      .from('saju_readings')
      .update({
        is_shared: false,
        shared_at: null,
      })
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .select(READING_SELECT)
      .single()

    setShareBusy(false)

    if (shareError) {
      console.error(shareError)
      setError('공유 중지에 실패했습니다.')
      return
    }

    setReadings((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    )
    setShareMessage('공유를 중지했어요. 링크는 더 이상 열리지 않습니다.')
  }

  const handleAnalyze = async () => {
    if (user && (needsOnboarding || !profile)) {
      setError('먼저 프로필 정보를 입력해 주세요.')
      setNeedsOnboarding(true)
      return
    }
    if (!name || !birthDate || !birthTime || !gender) {
      setError('이름, 생년월일, 시간, 성별을 모두 입력해 주세요.')
      return
    }

    const editingId = selectedId
    const canSave = Boolean(user && profile)
    setLoading(true)
    setError('')
    setResult('')

    const calendarText = calendarType === 'solar' ? '양력' : '음력'

    const prompt = `
return only Korean.
Use light Markdown for readability:
- Use ## for section titles
- Use short paragraphs and blank lines between sections
- Use - for bullet lists when helpful
- You may use **bold** for key phrases (it will be rendered, so structure is good)
Do not dump raw symbols without structure. Keep the reading organized.

당신은 사주밥이다. 스폰지밥처럼 밝고 과장되고 친근한 말투로 사주를 해석한다.
말투 규칙:
- "친구!", "아하하!", "난 준비됐어!", "짜잔!", "두구두구!" 같은 에너지 넘치는 표현을 자연스럽게 섞는다.
- 반말 위주의 신나는 말투를 쓰되, 내용은 사주 해석으로서 정확하고 이해하기 쉽게 전달한다.
- 차갑거나 딱딱한 전문가 말투는 쓰지 않는다. 그래도 핵심 근거는 분명히 말한다.

아래 섹션 순서로 정리해서 써 주세요:
## 한눈에 보기
## 성격과 기질
## 눈에 띄는 포인트
## 약점과 보완
## 돋보이는 재능
## 특이한 점
## 궁금한 점 하나

질문: 사주를 통해 이 사람의 전반적인 성격, 기질, 재능을 분석해 주세요.
사용자가 사주 용어에 익숙하지 않다고 가정하고, 쉽고 명확한 말로 설명하며 중요한 포인트에서는 핵심 사주 근거를 밝혀주세요.
1) 사주 명식을 바탕으로 흥미롭고 신나게 설명해 주세요.
2) 사주에서 특이하거나 눈에 띄는 점이 있으면 알려주세요.
3) 약점도 솔직하게, 그래도 응원하는 톤으로 말해 주세요.
4) 돋보이는 특징을 최소 한 가지 찾아 명확히 설명해 주세요.
5) 마지막은 사용자가 가장 궁금한 점을 묻는 질문으로 끝내주세요.
6) 판단 근거는 사용자가 제공한 모든 정보와 해석 가능한 모든 사주 정보를 종합해 제시해 주세요.
7) 긍정적 해석과 부정적 해석을 모두 고려해 주세요.
이외에도 특이한점 한가지를 찾아서 언급해 주세요.

이름: ${name}
성별: ${gender}
나이: 만 ${age}세
생년월일: ${birthDate} (${calendarText})
태어난 시간: ${birthTime}

${DEMO_CHART}

return only Korean.
`.trim()

    try {
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

      const text = data.text || '결과가 비어 있습니다.'
      setResult(text)

      if (!canSave) {
        writeGuestPending({
          name,
          birthDate,
          birthTime,
          gender,
          calendarType,
          result: text,
        })
      } else if (!isSupabaseConfigured || !supabase) {
        setError('해석은 완료됐지만 Supabase 환경변수가 없어 저장하지 못했습니다.')
      } else if (editingId != null) {
        const { data: updated, error: updateError } = await supabase
          .from('saju_readings')
          .update(buildReadingPayload(text))
          .eq('id', editingId)
          .eq('user_id', user.id)
          .select(READING_SELECT)
          .single()

        if (updateError) {
          console.error(updateError)
          setError('해석은 완료됐지만 수정 저장에 실패했습니다.')
        } else if (updated) {
          setSelectedId(updated.id)
          setReadings((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          )
        }
      } else {
        const { data: saved, error: saveError } = await supabase
          .from('saju_readings')
          .insert(buildReadingPayload(text))
          .select(READING_SELECT)
          .single()

        if (saveError) {
          console.error(saveError)
          setError('해석은 완료됐지만 저장에 실패했습니다.')
        } else if (saved) {
          setSelectedId(saved.id)
          setReadings((prev) => [saved, ...prev])
        }
      }
    } catch (err) {
      console.error(err)
      setError(getGeminiErrorMessage(err.message || String(err)))
    } finally {
      setLoading(false)
      setTimeout(scrollToResult, 50)
    }
  }

  const showForm = !user || (!needsOnboarding && !profileLoading)
  const blockedByProfile = Boolean(user && (needsOnboarding || profileLoading))
  const mascotMood = getMascotMood({
    needsOnboarding,
    loading,
    result,
    formReady,
    readingsCount: readings.length,
    hasProfile: Boolean(profile),
    isGuest,
  })

  return (
    <div className="layout">
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
                onClick={openProfileEditor}
                disabled={needsOnboarding || profileLoading}
              >
                프로필 수정
              </button>
              <button type="button" className="sidebar-auth-btn" onClick={handleSignOut}>
                로그아웃
              </button>
            </>
          ) : (
            <button type="button" className="sidebar-auth-btn sidebar-auth-btn--google" onClick={handleGoogleLogin}>
              Google로 로그인
            </button>
          )}
          {authError && <p className="sidebar-auth-error">{authError}</p>}
        </div>

        <div className="sidebar-head">
          <div className="sidebar-title-row">
            <h2 className="sidebar-title">내 사주 기록</h2>
            <span className="sidebar-count">{readings.length}</span>
          </div>
          <button
            type="button"
            className="sidebar-new"
            onClick={handleNewReading}
            disabled={Boolean(user && needsOnboarding)}
          >
            새 해석 시작
          </button>
        </div>

        {isGuest && (
          <div className="sidebar-empty-box">
            <p className="sidebar-empty">{MASCOT_LINES.guestSidebar}</p>
            <p className="sidebar-empty-hint">먼저 해석해 보고, 마음에 들면 로그인해서 저장하자!</p>
          </div>
        )}

        {!isGuest && listLoading && <p className="sidebar-empty">목록 불러오는 중… 조금만!</p>}
        {!isGuest && !listLoading && listError && <p className="sidebar-empty">{listError}</p>}
        {!isGuest && !listLoading && !listError && readings.length === 0 && (
          <div className="sidebar-empty-box">
            <p className="sidebar-empty">{MASCOT_LINES.empty}</p>
          </div>
        )}

        <ul className="sidebar-list">
          {readings.map((reading) => (
            <li key={reading.id} className="sidebar-item-row">
              <button
                type="button"
                className={
                  selectedId === reading.id
                    ? 'sidebar-item sidebar-item--active'
                    : 'sidebar-item'
                }
                onClick={() => handleSelectReading(reading)}
              >
                <span className="sidebar-item-name">{reading.name}</span>
                <span className="sidebar-item-meta">
                  {formatBirthDate(reading.birth_date)}
                  {reading.birth_time ? ` · ${formatBirthTime(reading.birth_time)}` : ''}
                </span>
              </button>
              <button
                type="button"
                className="sidebar-item-delete"
                aria-label={`${reading.name} 기록 삭제`}
                disabled={saving}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(reading)
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="app">
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
            onClick={handleNewReading}
            disabled={Boolean(user && needsOnboarding)}
          >
            새 해석 시작
          </button>
        </div>

        {user && profile && (
          <section className="profile-card" aria-label="내 프로필">
            <div className="profile-card-head">
              <div>
                <p className="profile-card-kicker">PROFILE</p>
                <h2>{profile.name}</h2>
              </div>
              <button type="button" className="btn-secondary" onClick={openProfileEditor}>
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
        )}

        {user && profileLoading && (
          <p className="status-line">프로필을 불러오는 중…</p>
        )}

        {showForm && (
          <>
            <div className="form" ref={formRef}>
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
                    기본값은 프로필입니다. 이번 해석만 다르게 보려면 여기서 수정하세요.
                    기본 정보는{' '}
                    <button type="button" className="text-link" onClick={openProfileEditor}>
                      프로필
                    </button>
                    에서 바꿉니다.
                  </>
                ) : (
                  <>로그인 없이도 해석할 수 있어! 전체 결과·저장은 Google 로그인 후에 열려.</>
                )}
              </p>

              <button type="button" onClick={handleAnalyze} disabled={loading || saving || blockedByProfile}>
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
                    onClick={handleUpdate}
                    disabled={loading || saving}
                  >
                    {saving ? '저장 중...' : '정보 수정 저장'}
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={loading || saving}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>

            <div className={name ? 'preview preview--filled' : 'preview'}>
              <p className="preview-kicker">名式</p>
              <p className="preview-name">{name || 'OOO'}님의 사주</p>
              {(birthDate || age != null) && (
                <p className="preview-sub">
                  {birthDate && formatBirthDate(birthDate)}
                  {birthDate && birthTime ? ` · ${birthTime}` : ''}
                  {age != null ? ` · 만 ${age}세` : ''}
                  {` · ${calendarLabel(calendarType)}`}
                </p>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="error" ref={errorRef} role="alert">
            {error}
          </p>
        )}

        {loading && (
          <section className="result skeleton skeleton--mascot" aria-busy="true" aria-label="사주 해석 중">
            <img
              className="skeleton-mascot"
              src="/assets/loading-image-removebg-preview.png"
              alt="사주 해석 중"
              width={180}
              height={180}
            />
            <span className="skeleton-badge">해석 중</span>
            <p className="skeleton-caption">{MASCOT_LINES.loading}</p>
          </section>
        )}

        {result && !loading && (
          <section
            ref={resultRef}
            className="result result--reveal"
            key={selectedId ?? 'live'}
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
                    onClick={handleGoogleLogin}
                  >
                    Google로 로그인하고 전체 보기
                  </button>
                </div>
              </div>
            )}

            {selectedId != null && user && (
              <div className="result-share">
                <div className="result-share-actions">
                  {!selectedReading?.is_shared ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleEnableShare}
                      disabled={shareBusy || saving}
                    >
                      {shareBusy ? '만드는 중…' : '공유 링크 만들기'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        disabled={shareBusy || saving}
                      >
                        링크 복사
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleDisableShare}
                        disabled={shareBusy || saving}
                      >
                        공유 중지
                      </button>
                    </>
                  )}
                </div>
                {shareMessage && <p className="result-share-msg">{shareMessage}</p>}
                {selectedReading?.is_shared && selectedReading?.share_token && (
                  <p className="result-share-url" title={getShareUrl(selectedReading.share_token)}>
                    {getShareUrl(selectedReading.share_token)}
                  </p>
                )}
              </div>
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
        )}
      </main>

      {needsOnboarding && user && (
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
              onClick={() => saveProfile({ asOnboarding: true })}
              disabled={profileSaving || !isProfileComplete(profileForm)}
            >
              {profileSaving ? '저장 중… 두구두구!' : '프로필 저장하고 출발!'}
            </button>
          </div>
        </div>
      )}

      {profileOpen && user && !needsOnboarding && (
        <div className="modal-backdrop" role="presentation" onClick={() => !profileSaving && setProfileOpen(false)}>
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
                onClick={() => setProfileOpen(false)}
                disabled={profileSaving}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => saveProfile()}
                disabled={profileSaving || !isProfileComplete(profileForm)}
              >
                {profileSaving ? '저장 중… 아하하!' : '프로필 저장!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!mascotAway && (
        <MascotBuddy mood={loading ? 'loading' : mascotMood} />
      )}
    </div>
  )
}

export default App
