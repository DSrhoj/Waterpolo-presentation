import { useState } from 'react'
import DataEntry from './pages/DataEntry'
import ControlPanel from './pages/ControlPanel'
import Presentation from './pages/Presentation'

const initialWindow =
  new URLSearchParams(window.location.search).get('window') ?? 'data-entry'

function App() {
  const [windowType] = useState(initialWindow)

  return (
    <div className="h-full w-full">
      {windowType === 'data-entry' && <DataEntry />}
      {windowType === 'control-panel' && <ControlPanel />}
      {windowType === 'presentation' && <Presentation />}
    </div>
  )
}

export default App
