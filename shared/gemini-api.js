import { GoogleGenAI } from '@google/genai'

export const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite']

export async function callGemini(apiKey, prompt) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')
  }
  if (!prompt) {
    throw new Error('prompt가 필요합니다.')
  }

  const ai = new GoogleGenAI({ apiKey })
  let lastError = null

  for (const model of MODELS) {
    try {
      const interaction = await ai.interactions.create({ model, input: prompt })
      return { text: interaction.output_text || '', model }
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('모든 모델 호출 실패')
}
