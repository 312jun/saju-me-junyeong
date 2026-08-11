import { callGemini } from '../../shared/gemini-api.js'

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405)
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

  try {
    const { prompt } = await req.json()
    const result = await callGemini(apiKey, prompt)
    return json(result)
  } catch (err) {
    return json({ error: err.message || String(err) }, 500)
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
