import { callGemini } from '../shared/gemini-api.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

  try {
    const prompt = req.body?.prompt
    const result = await callGemini(apiKey, prompt)
    return res.status(200).json(result)
  } catch (err) {
    const status = err.statusCode === 401 ? 401 : err.statusCode === 403 ? 403 : 500
    return res.status(status).json({ error: err.message || String(err) })
  }
}
