import { GoogleGenAI } from '@google/genai'

const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite']

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export function geminiProxy(apiKey) {
  return {
    name: 'gemini-proxy',
    configureServer(server) {
      if (!apiKey) {
        console.warn('[gemini-proxy] API key 없음 — .env에 GEMINI_API_KEY 설정 후 서버 재시작')
        return
      }

      const ai = new GoogleGenAI({ apiKey })
      console.log('[gemini-proxy] /api/gemini 준비됨 (키는 서버에서만 사용)')

      server.middlewares.use('/api/gemini', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'POST only' }))
          return
        }

        try {
          const raw = await readBody(req)
          const { prompt } = JSON.parse(raw)

          if (!prompt) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'prompt가 필요합니다.' }))
            return
          }

          let lastError = null
          for (const model of MODELS) {
            try {
              const interaction = await ai.interactions.create({ model, input: prompt })
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ text: interaction.output_text || '', model }))
              return
            } catch (err) {
              lastError = err
              console.warn(`[gemini-proxy] ${model} 실패:`, err.message)
            }
          }

          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: lastError?.message || '모든 모델 호출 실패' }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || String(err) }))
        }
      })
    },
  }
}
