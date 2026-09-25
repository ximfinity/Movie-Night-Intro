import { useProject } from '../state/useProject'
import './HomeScreen.css'

export default function HomeScreen(): React.JSX.Element {
  const { startNewProject, openProject } = useProject()

  return (
    <div className="home">
      <div className="home-glow" />
      <div className="home-card">
        <div className="home-badge">🎬</div>
        <h1>Movie Night Intro</h1>
        <p className="home-tagline">
          Build an animated pre-show playlist — video clips, music, and announcement slides — with a
          countdown that gets the audience hyped.
        </p>
        <div className="home-actions">
          <button className="btn btn-primary" onClick={startNewProject}>
            + New Project
          </button>
          <button className="btn" onClick={openProject}>
            Open Project
          </button>
        </div>
      </div>
    </div>
  )
}
