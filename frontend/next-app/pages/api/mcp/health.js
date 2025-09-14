/**
 * Next.js API route handler that proxies the MCP server health check.
 *
 * Attempts to fetch JSON from the MCP server's /health endpoint (MCP_SERVER_URL env var, default "http://127.0.0.1:8080")
 * and responds with that JSON and HTTP 200. If any error occurs (network, parsing, etc.), responds with HTTP 200 and
 * a simulated payload: { status: 'simulated' }.
 */
export default async function handler(req, res) {
  try {
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://127.0.0.1:8080';
    const r = await fetch(`${mcpServerUrl}/health`)
    const data = await r.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(200).json({status: 'simulated'})
  }
}
