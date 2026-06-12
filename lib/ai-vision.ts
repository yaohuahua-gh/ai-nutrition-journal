import OpenAI from 'openai'

type VisionProvider = {
  name: 'openai' | 'doubao' | 'zhipu'
  client: OpenAI
  model: string
}

export function getVisionProvider(): VisionProvider | null {
  const preferred = (process.env.AI_PROVIDER || '').toLowerCase()

  if (preferred === 'zhipu') return getZhipuProvider()
  if (preferred === 'doubao') return getDoubaoProvider()
  if (preferred === 'openai') return getOpenAiProvider()

  return getZhipuProvider() || getDoubaoProvider() || getOpenAiProvider()
}

function getOpenAiProvider(): VisionProvider | null {
  if (!process.env.OPENAI_API_KEY) return null
  return {
    name: 'openai',
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'
  }
}

function getDoubaoProvider(): VisionProvider | null {
  if (!process.env.DOUBAO_API_KEY || !process.env.DOUBAO_MODEL) return null
  return {
    name: 'doubao',
    client: new OpenAI({
      apiKey: process.env.DOUBAO_API_KEY,
      baseURL: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
    }),
    model: process.env.DOUBAO_MODEL
  }
}

function getZhipuProvider(): VisionProvider | null {
  if (!process.env.ZHIPU_API_KEY) return null
  return {
    name: 'zhipu',
    client: new OpenAI({
      apiKey: process.env.ZHIPU_API_KEY,
      baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
    }),
    model: process.env.ZHIPU_MODEL || 'glm-4v-flash'
  }
}

export function missingVisionConfigMessage() {
  const preferred = (process.env.AI_PROVIDER || '').toLowerCase()
  if (preferred === 'zhipu') return 'ZHIPU_API_KEY is not configured.'
  if (preferred === 'doubao') return 'DOUBAO_API_KEY or DOUBAO_MODEL is not configured.'
  if (preferred === 'openai') return 'OPENAI_API_KEY is not configured.'
  return 'No vision provider is configured. Set ZHIPU_API_KEY, DOUBAO_API_KEY + DOUBAO_MODEL, or OPENAI_API_KEY.'
}
