import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  calendarLabel,
  formatBirthDate,
  formatBirthTime,
  genderLabel,
} from '../utils/format'
import { trackClick } from '../utils/analytics'
import '../App.css'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function SharedResultPage() {
  const { shareToken } = useParams()
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      setReading(null)

      if (!shareToken || !UUID_RE.test(shareToken)) {
        if (!cancelled) {
          setError('유효하지 않은 공유 링크입니다.')
          setLoading(false)
        }
        return
      }

      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setError('서비스 설정이 없어 결과를 불러올 수 없습니다.')
          setLoading(false)
        }
        return
      }

      const { data, error: fetchError } = await supabase.rpc('get_shared_reading', {
        p_token: shareToken,
      })

      if (cancelled) return

      if (fetchError) {
        console.error(fetchError)
        setError('공유된 결과를 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        setError('공유가 꺼졌거나, 존재하지 않는 링크입니다.')
        setLoading(false)
        return
      }

      setReading(row)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [shareToken])

  return (
    <div className="layout layout--shared">
      <header className="shared-topbar">
        <Link
          to="/"
          className="shared-brand"
          onClick={() => trackClick('shared_home', { location: 'shared_brand' })}
        >
          <img
            src="/assets/character-img.PNG"
            alt=""
            width={36}
            height={36}
            aria-hidden="true"
          />
          <span>사주미</span>
        </Link>
        <Link
          to="/"
          className="shared-home-link"
          onClick={() => trackClick('shared_home', { location: 'shared_topbar' })}
        >
          내 사주도 보기
        </Link>
      </header>

      <main className="shared-main">
        {loading && (
          <section className="result skeleton skeleton--mascot" aria-busy="true" aria-label="결과 불러오는 중">
            <img
              className="skeleton-mascot"
              src="/assets/loading-image-removebg-preview.png"
              alt=""
              width={180}
              height={180}
            />
            <span className="skeleton-badge">불러오는 중</span>
            <p className="skeleton-caption">친구의 사주 결과를 열어보는 중이야!</p>
          </section>
        )}

        {!loading && error && (
          <section className="shared-empty" role="alert">
            <img src="/assets/character-img.PNG" alt="" width={88} height={88} />
            <h1>결과를 볼 수 없어요</h1>
            <p>{error}</p>
            <Link
              to="/"
              className="shared-cta"
              onClick={() => trackClick('shared_home', { location: 'shared_error_cta' })}
            >
              사주미로 돌아가기
            </Link>
          </section>
        )}

        {!loading && reading && (
          <section
            className="result result--reveal"
            aria-label={`${reading.name || '친구'} 사주 해석`}
          >
            <div className="result-header">
              <div>
                <p className="result-kicker">공유된 사주 해석</p>
                <h2>{reading.name || 'OOO'}님의 사주</h2>
              </div>
              <span className="result-badge">공유됨</span>
            </div>

            <dl className="result-meta">
              <div>
                <dt>생년월일</dt>
                <dd>{formatBirthDate(reading.birth_date) || '-'}</dd>
              </div>
              <div>
                <dt>시간</dt>
                <dd>{formatBirthTime(reading.birth_time) || '-'}</dd>
              </div>
              <div>
                <dt>성별</dt>
                <dd>{genderLabel(reading.gender)}</dd>
              </div>
              <div>
                <dt>달력</dt>
                <dd>{calendarLabel(reading.calendar_type)}</dd>
              </div>
            </dl>

            <div className="result-divider" aria-hidden="true">
              <span>釋</span>
            </div>

            <div className="result-body">
              <ReactMarkdown>{reading.result || ''}</ReactMarkdown>
            </div>

            <p className="shared-footnote">
              친구가 공유한 읽기 전용 결과예요. 로그인 없이 볼 수 있어요.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
