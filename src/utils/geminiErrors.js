export function getGeminiErrorMessage(raw) {
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
