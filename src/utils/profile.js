import { formatBirthTime } from './format'

export const EMPTY_PROFILE_FORM = {
  name: '',
  birthDate: '',
  birthTime: '',
  gender: '',
  calendarType: 'solar',
}

export function profileToForm(profile) {
  if (!profile) return { ...EMPTY_PROFILE_FORM }
  return {
    name: profile.name || '',
    birthDate: profile.birth_date || '',
    birthTime: formatBirthTime(profile.birth_time),
    gender: profile.gender || '',
    calendarType: profile.calendar_type || 'solar',
  }
}

export function isProfileComplete(form) {
  return Boolean(form.name && form.birthDate && form.birthTime && form.gender && form.calendarType)
}
