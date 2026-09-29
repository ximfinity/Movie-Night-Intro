import { useState } from 'react'
import type { MovieSource } from '@shared/types'
import {
  DEFAULT_CONCESSIONS,
  DEFAULT_EVENTS,
  SECTIONS,
  THEME_NIGHTS,
  buildShow,
  findThemeNight,
  toLines,
  type SectionId,
  type ThemeNightId
} from '@shared/builtinTemplates'
import { findSlideTheme } from '@shared/slideThemes'
import { formatTimeOfDay, parseTimeOfDay } from '@shared/countdown'
import { useProject } from '../state/useProject'
import './NewShowWizard.css'

type Step = 'theme' | 'details' | 'sections'

/** A sensible default showtime: 7 PM, or the next half hour at least 45 minutes out. */
function defaultShowtime(): string {
  const now = new Date()
  const seven = new Date(now)
  seven.setHours(19, 0, 0, 0)
  if (seven.getTime() - now.getTime() >= 45 * 60_000) return '19:00'
  const t = new Date(now.getTime() + 45 * 60_000)
  t.setMinutes(t.getMinutes() < 30 ? 30 : 60, 0, 0)
  return formatTimeOfDay(t)
}

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

/** Guided "new show": pick a theme night, fill in a few details, choose sections, and get a
 * complete, ready-to-run pre-show with every slide already written. */
export default function NewShowWizard({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { createShowFromWizard } = useProject()
  const [step, setStep] = useState<Step>('theme')
  const [themeId, setThemeId] = useState<ThemeNightId>('classic')
  const theme = findThemeNight(themeId)
  const [movieTitle, setMovieTitle] = useState('')
  const [showtime, setShowtime] = useState(defaultShowtime)
  const [guestOfHonor, setGuestOfHonor] = useState('')
  const [orgName, setOrgName] = useState('')
  const [donationUrl, setDonationUrl] = useState('')
  const [concessions, setConcessions] = useState(DEFAULT_CONCESSIONS.join('\n'))
  const [sponsors, setSponsors] = useState('')
  const [events, setEvents] = useState(DEFAULT_EVENTS.join('\n'))
  const [movieSource, setMovieSource] = useState<MovieSource>('none')
  const [filePath, setFilePath] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [autoStart, setAutoStart] = useState(false)
  const [sections, setSections] = useState<SectionId[]>(theme.defaultSections)
  const [creating, setCreating] = useState(false)

  function chooseTheme(id: ThemeNightId): void {
    setThemeId(id)
    setSections(findThemeNight(id).defaultSections)
    setStep('details')
  }

  async function pickMovie(): Promise<void> {
    const path = await window.api.pickMovieFile()
    if (!path) return
    setFilePath(path)
    if (!movieTitle.trim()) {
      setMovieTitle(
        fileNameOf(path)
          .replace(/\.[^.]+$/, '')
          .replace(/[._]+/g, ' ')
          .trim()
      )
    }
  }

  const details = {
    movieTitle,
    guestOfHonor,
    orgName,
    concessions: toLines(concessions),
    sponsors: toLines(sponsors),
    events: toLines(events)
  }
  const preview = buildShow(themeId, sections, details)
  const slideCount = preview.items.reduce((n, g) => n + g.frames.length, 0)
  const streamOk = movieSource !== 'stream' || /^https:\/\//i.test(streamUrl.trim())
  const showtimeOk = parseTimeOfDay(showtime) !== null

  async function create(): Promise<void> {
    setCreating(true)
    const ok = await createShowFromWizard({
      theme: themeId,
      sections,
      details,
      showtime,
      donationUrl: sections.includes('fundraiser') ? donationUrl : '',
      movie: {
        source: movieSource === 'file' && !filePath ? 'none' : movieSource,
        filePath,
        streamUrl: streamUrl.trim()
      },
      startMode: autoStart ? 'auto' : 'manual'
    })
    setCreating(false)
    if (ok) onClose()
  }

  return (
    <div className="wizard" role="dialog" aria-label="New show">
      <div className="wizard-card">
        <header className="wizard-header">
          <div>
            <div className="wizard-kicker">New show</div>
            <h2>
              {step === 'theme' && 'What kind of movie night?'}
              {step === 'details' && `${theme.emoji} ${theme.label}: the details`}
              {step === 'sections' && 'What should the pre-show include?'}
            </h2>
          </div>
          <ol className="wizard-steps" aria-label="Steps">
            {(['theme', 'details', 'sections'] as Step[]).map((s, i) => (
              <li key={s} className={s === step ? 'wizard-step-current' : ''}>
                {i + 1}
              </li>
            ))}
          </ol>
        </header>

        {step === 'theme' && (
          <div className="wizard-body">
            <div className="theme-grid">
              {THEME_NIGHTS.map((t) => (
                <button
                  key={t.id}
                  className={`theme-card ${t.id === themeId ? 'theme-card-selected' : ''}`}
                  onClick={() => chooseTheme(t.id)}
                >
                  <div className="theme-card-swatches">
                    {t.palette.map((p) => (
                      <span key={p} style={{ background: findSlideTheme(p).background }} />
                    ))}
                  </div>
                  <div className="theme-card-emoji">{t.emoji}</div>
                  <div className="theme-card-label">{t.label}</div>
                  <div className="theme-card-desc">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="wizard-body wizard-form">
            <div className="wizard-row">
              <label className="field">
                <span className="field-label">Tonight&apos;s movie</span>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Hocus Pocus"
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                />
              </label>
              <label className="field wizard-time">
                <span className="field-label">Showtime</span>
                <input type="time" value={showtime} onChange={(e) => setShowtime(e.target.value)} />
              </label>
            </div>

            {themeId === 'birthday' && (
              <label className="field">
                <span className="field-label">Whose birthday is it?</span>
                <input
                  type="text"
                  placeholder="e.g. Maya"
                  value={guestOfHonor}
                  onChange={(e) => setGuestOfHonor(e.target.value)}
                />
              </label>
            )}

            {themeId === 'pta' && (
              <>
                <div className="wizard-row">
                  <label className="field">
                    <span className="field-label">School or group</span>
                    <input
                      type="text"
                      placeholder="e.g. Lincoln Elementary"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Donation link (makes a QR code slide)</span>
                    <input
                      type="url"
                      placeholder="https://…"
                      value={donationUrl}
                      onChange={(e) => setDonationUrl(e.target.value)}
                    />
                  </label>
                </div>
                <div className="wizard-row wizard-row-3">
                  <label className="field">
                    <span className="field-label">Concessions (item | price)</span>
                    <textarea
                      rows={5}
                      value={concessions}
                      onChange={(e) => setConcessions(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Sponsors (one per line)</span>
                    <textarea
                      rows={5}
                      placeholder={'Joe’s Pizza\nMain St. Dental'}
                      value={sponsors}
                      onChange={(e) => setSponsors(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Upcoming events (event | date)</span>
                    <textarea rows={5} value={events} onChange={(e) => setEvents(e.target.value)} />
                  </label>
                </div>
              </>
            )}

            <span className="field-label-plain">How will you play the movie?</span>
            <div className="frame-content-toggle" role="radiogroup">
              {(
                [
                  ['none', 'Decide later'],
                  ['file', '🎞️ File on this PC'],
                  ['stream', '🌐 Streaming link']
                ] as [MovieSource, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={movieSource === value}
                  className={`btn frame-toggle-btn ${movieSource === value ? 'frame-toggle-active' : ''}`}
                  onClick={() => setMovieSource(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {movieSource === 'file' && (
              <div className="picker-row wizard-movie">
                <div className="feature-path" title={filePath}>
                  {filePath ? fileNameOf(filePath) : 'No file chosen'}
                </div>
                <button className="btn" onClick={pickMovie}>
                  {filePath ? 'Change…' : 'Choose movie…'}
                </button>
              </div>
            )}
            {movieSource === 'stream' && (
              <label className="field">
                <span className="field-label">Link from Netflix, Disney+, etc.</span>
                <input
                  type="url"
                  placeholder="https://www.disneyplus.com/…"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                />
              </label>
            )}
            {!streamOk && <p className="feature-warning">⚠ The link must start with https://</p>}
            {!showtimeOk && (
              <p className="feature-warning">
                ⚠ Set a showtime, so the countdown knows when to start.
              </p>
            )}
            {movieSource !== 'none' && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                />
                Start the movie automatically at showtime (otherwise it waits for your go button)
              </label>
            )}
          </div>
        )}

        {step === 'sections' && (
          <div className="wizard-body">
            <div className="section-list">
              {theme.sections.map((id) => {
                const info = SECTIONS[id]
                const on = sections.includes(id)
                return (
                  <label key={id} className={`section-option ${on ? 'section-option-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setSections((list) =>
                          e.target.checked ? [...list, id] : list.filter((s) => s !== id)
                        )
                      }
                    />
                    <span>
                      <span className="section-option-label">{info.label}</span>
                      <span className="section-option-desc">{info.description}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="inspector-hint wizard-summary">
              {preview.items.length} slide group{preview.items.length === 1 ? '' : 's'},{' '}
              {slideCount} slides, all with silly lines already written, plus a countdown to{' '}
              {showtime}, a hold screen and a thanks card. Next, choose a folder to save the show
              in; you can change anything afterwards.
            </p>
          </div>
        )}

        <footer className="wizard-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <div className="wizard-footer-right">
            {step !== 'theme' && (
              <button
                className="btn"
                disabled={creating}
                onClick={() => setStep(step === 'sections' ? 'details' : 'theme')}
              >
                ← Back
              </button>
            )}
            {step === 'details' && (
              <button
                className="btn btn-primary"
                disabled={!streamOk || !showtimeOk}
                onClick={() => setStep('sections')}
              >
                Next →
              </button>
            )}
            {step === 'sections' && (
              <button
                className="btn btn-primary"
                disabled={creating || sections.length === 0}
                onClick={create}
              >
                {creating ? 'Creating…' : '✨ Create my show'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
