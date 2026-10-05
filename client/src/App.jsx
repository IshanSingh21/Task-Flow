import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState('Loading backend status...')

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => res.json())
      .then(data => setStatus(`Backend is ${data.message}`))
      .catch(err => setStatus('Backend is offline or unreachable'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">TaskFlow</h1>
        <p className="text-gray-600 mb-6">Project & Team Management Platform</p>
        
        <div className="p-4 bg-gray-50 rounded border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">System Status</h2>
          <p className={`text-sm ${status.includes('offline') ? 'text-red-500' : 'text-green-500'}`}>
            {status}
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
