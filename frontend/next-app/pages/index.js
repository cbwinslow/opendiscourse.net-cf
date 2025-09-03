import React, {useEffect, useState} from 'react'

export default function Home() {
  const [status, setStatus] = useState('unknown')

  useEffect(() => {
    fetch('/api/mcp/health')
      .then(r => r.json())
      .then(d => setStatus(d.status || 'unknown'))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main style={{padding: 24}}>
      <h1>OpenDiscourse MCP Dashboard</h1>
      <p>MCP server status: <strong>{status}</strong></p>
      <p>This is a minimal Next.js integration that proxies to the MCP server.</p>
    </main>
  )
}
