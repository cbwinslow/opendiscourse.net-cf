export default async function handler(req, res) {
  try {
    const r = await fetch('http://127.0.0.1:8080/health')
    const data = await r.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(200).json({status: 'simulated'})
  }
}
