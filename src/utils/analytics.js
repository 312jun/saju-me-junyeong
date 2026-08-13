/**
 * GA4 이벤트 전송. gtag가 없으면 무시합니다.
 * @param {string} eventName
 * @param {Record<string, string | number | boolean | undefined>} [params]
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params)
}

/**
 * 버튼 클릭 전용 헬퍼
 * @param {string} buttonName
 * @param {Record<string, string | number | boolean | undefined>} [params]
 */
export function trackClick(buttonName, params = {}) {
  trackEvent('button_click', { button_name: buttonName, ...params })
}
