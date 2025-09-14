import React, {useEffect, useState} from 'react'

/**
 * React component that displays the health status of the MCP server.
 *
 * On mount, it requests '/api/mcp/health' and shows the returned `status` value.
 * If the response lacks a `status` field the UI shows "unknown". If the fetch
 * or response parsing fails, the UI shows "unreachable".
 *
 * @returns {JSX.Element} The dashboard UI showing the MCP server status.
 */
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
