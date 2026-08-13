import { formatBirthDate, calendarLabel } from '../../utils/format'

export default function FormPreview({ name, birthDate, birthTime, age, calendarType }) {
  return (
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
  )
}
