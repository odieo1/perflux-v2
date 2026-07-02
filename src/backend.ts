declare const spindle: import('lumiverse-spindle-types').SpindleAPI

type GenerateRequest = {
  prompt: string
  style: 'Photo-realistic' | 'vintage' | '3d' | 'cartoon'
  count: number
  seed?: number | null
  apiKey?: string | null
}

type FrontendEnvelope = {
  type: 'perflux:generate'
  request: GenerateRequest
}

const STYLE_TAGS: Record<GenerateRequest['style'], string> = {
  'Photo-realistic': 'photorealistic, ultra-detailed, realistic lighting',
  'vintage': 'vintage style, retro tones, nostalgic aesthetic',
  '3d': '3d render, volumetric lighting, highly detailed',
  'cartoon': 'cartoon style, illustrated, bold outlines'
}


    });

    if (!response.ok) throw new Error(`Image fetch failed: ${response.statusText}`);
    
    // Returns the raw image buffer or image URL depending on Lumiverse requirements
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Pollinations Image API Error:", error);
    throw error;
  }
}
//GET API FROM SECRETS AND VARIABLES IN HUGGINGFACE HUB
import os
from huggingface_hub import InferenceClient

# Import the secret from your Hugging Face Environment
api_key = os.getenv("POLLINATIONS_API_KEY")

# Use the secret in your application
client = InferenceClient(api_key=api_key)
//CONTINUE GENERATION

  const finalPrompt = `${request.prompt.trim()}, ${STYLE_TAGS[request.style]}`
  const seed = Number.isFinite(request.seed as number)
    ? Number(request.seed)
    : Math.floor(Math.random() * 1000000000) + index

  const url = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(finalPrompt))
  url.searchParams.set('model', 'flux')
  url.searchParams.set('seed', String(seed))
  url.searchParams.set('nologo', 'true')
  url.searchParams.set('private', 'true')
  url.searchParams.set('enhance', 'false')
  url.searchParams.set('safe', 'false')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${resolvedKey}`,
      Accept: 'image/jpeg'
    }
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Pollinations request failed (${response.status}): ${detail || response.statusText}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)

  return {
    index,
    seed,
    prompt: finalPrompt,
    mimeType: response.headers.get('content-type') || 'image/jpeg',
    dataUrl: `data:${response.headers.get('content-type') || 'image/jpeg'};base64,${base64}`
  }
}

spindle.onFrontendMessage(async (raw: FrontendEnvelope, meta: any) => {
  if (!raw || raw.type !== 'perflux:generate') return

  try {
    const count = Math.max(1, Math.min(6, Number(raw.request.count || 1)))
    const jobs = Array.from({ length: count }, (_, index) => generateOne({ ...raw.request, count }, index, meta?.userId))
    spindle.sendToFrontend({ type: 'perflux:status', status: 'loading', count }, meta?.userId)
      // A smart delay function that handles dynamic backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateImageWithRetry(promptData, retries = 5, delay = 2000) {
  try {
    // Replace this with your actual API generation call
    return await api.generateImage(promptData); 
  } catch (error) {
    // Check if the error is a 429 Rate Limit
    if (error.status === 429 && retries > 0) {
      // Add randomness (jitter) so requests don't bunch up
      const jitter = Math.random() * 1000;
      const backoffDelay = delay + jitter;
      
      console.warn(`Rate limited. Retrying in ${(backoffDelay / 1000).toFixed(2)}s...`);
      await sleep(backoffDelay);
      
      // Retry with double the base delay time
      return generateImageWithRetry(promptData, retries - 1, delay * 2);
    }
    // Throw error if it's not a 429 or we ran out of retries
    throw error; 
  }
}
    
    spindle.sendToFrontend({ type: 'perflux:results', images }, meta?.userId)
  } catch (error: any) {
    spindle.sendToFrontend({
      type: 'perflux:error',
      message: error?.message || 'Image generation failed.'
    }, meta?.userId)
  }
})
