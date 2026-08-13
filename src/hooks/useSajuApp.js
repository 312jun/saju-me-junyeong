import { useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { getMascotMood } from '../components/mascot/mascotConfig'
import { DEMO_CHART } from '../constants/demoChart'
import { READING_SELECT } from '../constants/readings'
import { getKoreanAge, formatBirthTime } from '../utils/format'
import { getGeminiErrorMessage } from '../utils/geminiErrors'
import { splitResultForTeaser, readGuestPending, writeGuestPending, clearGuestPending } from '../utils/guestPending'
import { EMPTY_PROFILE_FORM, profileToForm, isProfileComplete } from '../utils/profile'

export function useSajuApp() {
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

  const shareUrl = selectedReading?.share_token
    ? getShareUrl(selectedReading.share_token)
    : ''

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

  return {
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
    result,
    setResult,
    loading,
    error,
    mascotAway,
    readings,
    selectedId,
    listError,
    listLoading,
    saving,
    shareBusy,
    shareMessage,
    user,
    authLoading,
    authError,
    profile,
    profileLoading,
    profileError,
    profileSaving,
    needsOnboarding,
    profileOpen,
    setProfileOpen,
    profileForm,
    setProfileForm,
    filledCount,
    formReady,
    age,
    isGuest,
    userLabel,
    teaser,
    showLockedResult,
    showForm,
    blockedByProfile,
    mascotMood,
    selectedReading,
    shareUrl,
    resultRef,
    formRef,
    nameInputRef,
    errorRef,
    handleGoogleLogin,
    handleSignOut,
    saveProfile,
    openProfileEditor,
    handleSelectReading,
    handleNewReading,
    handleUpdate,
    handleDelete,
    handleEnableShare,
    handleCopyShareLink,
    handleDisableShare,
    handleAnalyze,
    getShareUrl,
  }
}
