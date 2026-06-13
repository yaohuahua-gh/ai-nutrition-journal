import OpenAI from 'openai'

type VisionProvider = {
  name: 'zhipu'
  client: OpenAI
  model: string
}

export function getVisionProvider(): VisionProvider | null {
  return getZhipuProvider()
}

function getZhipuProvider(): VisionProvider | null {
  if (!process.env.ZHIPU_API_KEY) return null
  return {
    name: 'zhipu',
    client: new OpenAI({
      apiKey: process.env.ZHIPU_API_KEY,
      baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      timeout: 45_000,
      maxRetries: 1
    }),
    model: process.env.ZHIPU_MODEL || 'glm-4v-flash'
  }
}

export function missingVisionConfigMessage() {
  return 'ZHIPU_API_KEY is not configured.'
}
