import { RANDOM_THEME, SLIDE_THEMES } from '@shared/slideThemes'

/** Visual theme picker: each swatch shows the theme's real background and title colors. */
export default function ThemeSwatches({
  value,
  onChange
}: {
  value: string
  onChange: (themeId: string) => void
}): React.JSX.Element {
  const selectedLabel =
    value === RANDOM_THEME
      ? 'Random each time'
      : (SLIDE_THEMES.find((t) => t.id === value)?.label ?? value)

  return (
    <div className="field">
      <span className="field-label">
        Theme <span>{selectedLabel}</span>
      </span>
      <div className="theme-swatches" role="radiogroup" aria-label="Theme">
        <button
          type="button"
          role="radio"
          aria-checked={value === RANDOM_THEME}
          className={`theme-swatch theme-swatch-random ${value === RANDOM_THEME ? 'theme-swatch-selected' : ''}`}
          title="Random each time — a different theme every time this slide appears"
          onClick={() => onChange(RANDOM_THEME)}
        >
          🎲
        </button>
        {SLIDE_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={value === t.id}
            aria-label={t.label}
            className={`theme-swatch ${value === t.id ? 'theme-swatch-selected' : ''}`}
            title={t.label}
            style={{ background: t.background }}
            onClick={() => onChange(t.id)}
          >
            <span
              style={{
                backgroundImage: `linear-gradient(135deg, ${t.titleFrom}, ${t.titleTo})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Aa
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
