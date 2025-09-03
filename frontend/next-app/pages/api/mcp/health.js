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
