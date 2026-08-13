export function getKoreanAge(birthDate) {
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

export function genderLabel(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return value || '-'
}

export function calendarLabel(value) {
  return value === 'lunar' ? '음력' : '양력'
}

export function formatBirthDate(value) {
  if (!value) return ''
  const [y, m, d] = String(value).split('-')
  if (!y || !m || !d) return value
  return `${y}.${m}.${d}`
}

export function formatBirthTime(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}
