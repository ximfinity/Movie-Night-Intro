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
  const [startIndex, setStartIndex] = useState(0)

  if (!dir || !project) {
    return <HomeScreen />
  }

  if (view === 'show') {
    return <ShowPlayer startIndex={startIndex} onExit={() => setView('editor')} />
  }

  return (
    <EditorScreen
      onStartShow={(index) => {
        setStartIndex(index ?? 0)
        setView('show')
      }}
    />
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
