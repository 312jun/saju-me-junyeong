import { MASCOT_LINES } from '../mascot/mascotConfig'

export default function LoadingSkeleton() {
  return (
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
  )
}
