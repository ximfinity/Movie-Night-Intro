import { useState } from 'react'
import { useProject } from '../state/useProject'
import { useRemoteState } from '../hooks/useRemote'
import logoUrl from '../assets/logo.svg'
import NewShowWizard from './NewShowWizard'
import './HomeScreen.css'

export default function HomeScreen(): React.JSX.Element {
  const { startNewProject, openProject } = useProject()
  const [wizardOpen, setWizardOpen] = useState(false)
  useRemoteState(() => ({ phase: 'home' }), 2000)

  return (
    <div className="home">
      <div className="home-glow" />
      <div className="home-card">
        <img className="home-logo" src={logoUrl} alt="" />
        <h1>Movie Night Intro</h1>
        <p className="home-tagline">
          Build an animated pre-show — slides, clips and music with a countdown — then roll right
          into the feature.
        </p>
        <button className="btn btn-primary home-wizard-btn" onClick={() => setWizardOpen(true)}>
          ✨ New Show
          <span className="home-btn-hint">Pick a theme night; every slide comes written</span>
        </button>
        <div className="home-actions">
          <button className="btn" onClick={startNewProject}>
            + Blank project
          </button>
          <button className="btn" onClick={openProject}>
            Open Project
          </button>
        </div>
      </div>
      {wizardOpen && <NewShowWizard onClose={() => setWizardOpen(false)} />}
    </div>
  )
}
