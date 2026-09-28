import { useState } from 'react'
import { ProjectProvider } from './state/ProjectContext'
import { useProject } from './state/useProject'
import ErrorBoundary from './components/ErrorBoundary'
import CrashScreen from './components/CrashScreen'
import HomeScreen from './screens/HomeScreen'
import EditorScreen from './screens/EditorScreen'
import ShowPlayer from './screens/ShowPlayer/ShowPlayer'

type View = 'editor' | 'show'

function Shell(): React.JSX.Element {
  const { dir, project } = useProject()
  const [view, setView] = useState<View>('editor')
  const [startIndex, setStartIndex] = useState(0)
  const [resumeAtSec, setResumeAtSec] = useState<number | undefined>(undefined)

  if (!dir || !project) {
    return <HomeScreen />
  }

  if (view === 'show') {
    return (
      <ErrorBoundary
        fallback={(error) => (
          <CrashScreen
            title="The show hit an unexpected problem"
            detail={error.message}
            actionLabel="Back to the editor"
            onAction={() => setView('editor')}
          />
        )}
      >
        <ShowPlayer
          startIndex={startIndex}
          resumeAtSec={resumeAtSec}
          onExit={() => setView('editor')}
        />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <CrashScreen
          title="Something went wrong in the editor"
          detail={`${error.message} — your project is still open; undo or reopen it if something looks off.`}
          actionLabel="Try again"
          onAction={reset}
        />
      )}
    >
      <EditorScreen
        onStartShow={(index) => {
          setStartIndex(index ?? 0)
          setResumeAtSec(undefined)
          setView('show')
        }}
        onResumeMovie={(atSec) => {
          setResumeAtSec(atSec)
          setView('show')
        }}
      />
    </ErrorBoundary>
  )
}

function App(): React.JSX.Element {
  return (
    <ProjectProvider>
      <Shell />
    </ProjectProvider>
  )
}

export default App
