import { useState } from 'react'
import { ProjectProvider } from './state/ProjectContext'
import { useProject } from './state/useProject'
import HomeScreen from './screens/HomeScreen'
import EditorScreen from './screens/EditorScreen'
import ShowPlayer from './screens/ShowPlayer/ShowPlayer'

type View = 'editor' | 'show'

function Shell(): React.JSX.Element {
  const { dir, project } = useProject()
  const [view, setView] = useState<View>('editor')

  if (!dir || !project) {
    return <HomeScreen />
  }

  if (view === 'show') {
    return <ShowPlayer onExit={() => setView('editor')} />
  }

  return <EditorScreen onStartShow={() => setView('show')} />
}

function App(): React.JSX.Element {
  return (
    <ProjectProvider>
      <Shell />
    </ProjectProvider>
  )
}

export default App
