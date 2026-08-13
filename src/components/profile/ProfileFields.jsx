export default function ProfileFields({ idPrefix, values, onChange, disabled }) {
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
