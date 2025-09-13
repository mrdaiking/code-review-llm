import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          remove the count button and test first commit
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Change Github Action flow and test second commit
      </p>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more about Vite and React
      </p>
      <p className="read-the-docs">
        Edit <code>src/App.jsx</code> and save to test HMR again
      </p>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more about Vite and React again
      </p>
      <p className="read-the-docs">
        Edit <code>src/App.jsx</code> and save to test HMR again and again
      </p>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more about Vite and React again and again
      </p>
      <p className="read-the-docs">
        Edit <code>src/App.jsx</code> and save to test HMR again and again and again
      </p>
    </>
  )
}

export default App
