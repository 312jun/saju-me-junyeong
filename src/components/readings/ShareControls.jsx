import { trackClick } from '../../utils/analytics'

export default function ShareControls({
  selectedReading,
  shareBusy,
  saving,
  shareMessage,
  shareUrl,
  onEnableShare,
  onCopyShareLink,
  onDisableShare,
}) {
  return (
    <div className="result-share">
      <div className="result-share-actions">
        {!selectedReading?.is_shared ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              trackClick('enable_share', { location: 'share_controls' })
              onEnableShare()
            }}
            disabled={shareBusy || saving}
          >
            {shareBusy ? '만드는 중…' : '공유 링크 만들기'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                trackClick('copy_share_link', { location: 'share_controls' })
                onCopyShareLink()
              }}
              disabled={shareBusy || saving}
            >
              링크 복사
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                trackClick('disable_share', { location: 'share_controls' })
                onDisableShare()
              }}
              disabled={shareBusy || saving}
            >
              공유 중지
            </button>
          </>
        )}
      </div>
      {shareMessage && <p className="result-share-msg">{shareMessage}</p>}
      {selectedReading?.is_shared && selectedReading?.share_token && (
        <p className="result-share-url" title={shareUrl}>
          {shareUrl}
        </p>
      )}
    </div>
  )
}
