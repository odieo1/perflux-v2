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
  vintage: 'vintage style, retro tones, nostalgic aesthetic',
  '3d': '3d render, volumetric lighting, highly detailed',
  cartoon: 'cartoon style, illustrated, bold outlines'
}

// backend.ts
import { OpenAI } from 'openai'; // Pollinations is fully OpenAI-compatible

// 1. Fetch the secret Pollinations API key securely from Hugging Face environment variables
const pollinationsKey = process.env.POLLINATIONS_API_KEY;

if (!pollinationsKey) {
  throw new Error("POLLINATIONS_API_KEY is not defined in Hugging Face Repository Secrets.");
}

// 2. Initialize the OpenAI client pointing to the Pollinations Base URL
// Pollinations secret keys start with 'sk_*' for backend use
const pollinationsClient = new OpenAI({
  baseURL: 'https://gen.pollinations.ai/v1', 
  apiKey: pollinationsKey,
});

/**
 * Generates text response using Pollinations AI (Lumiverse Spindle Backend)
 */
export async function generateText(prompt: string, model: string = 'openai') {
  try {
    const response = await pollinationsClient.chat.completions.create({
      model: model, // e.g., 'openai', 'mistral', 'qwen'
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Pollinations Text API Error:", error);
    throw error;
  }
}

/**
 * Generates images for Lumiverse scene/chat backgrounds via Pollinations
 */
export async function generateSceneImage(prompt: string, model: string = 'flux') {
  try {
    // Pollinations image generation via GET or POST
    const response = await fetch(`https://pollinations.ai{encodeURIComponent(prompt)}?model=${model}`, {
      headers: {
        'Authorization': `Bearer ${pollinationsKey}`
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


// 3. Your generation entrypoint handles the logic routing safely
async function generateOne(request: GenerateRequest, index: number, userId?: string) {
  
  // Rule 1: Use explicit request key if provided
  let resolvedKey = request.apiKey?.trim();

  // Rule 2: If no key, look up via user session (if logged in) or the global system secret
  if (!resolvedKey) {
    resolvedKey = userId 
      ? (await getUserSavedApiKey(userId)) ?? getGlobalApiKey()
      : getGlobalApiKey();
  }

  if (!resolvedKey) {
    throw new Error('No Pollinations API key available. Save POLLINATIONS_API or POLINATIONS_API in Lumiverse secrets, or enter a key in the PerFlux UI.');
  }

  // Your generation code continues...
}



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
