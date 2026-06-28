// @bun
// src/backend.ts
var STYLE_TAGS = {
  "Photo-realistic": "photorealistic, ultra-detailed, realistic lighting",
  vintage: "vintage style, retro tones, nostalgic aesthetic",
  "3d": "3d render, volumetric lighting, highly detailed",
  cartoon: "cartoon style, illustrated, bold outlines"
};
async function getSavedApiKey(userId) {
  return await spindle.enclave.get("POLLINATIONS_API", userId) ?? await spindle.enclave.get("POLINATIONS_API", userId) ?? null;
}
async function generateOne(request, index, userId) {
  const resolvedKey = request.apiKey?.trim() || await getSavedApiKey(userId);
  if (!resolvedKey) {
    throw new Error("No Pollinations API key available. Save POLLINATIONS_API or POLINATIONS_API in Lumiverse secrets, or enter a key in the PerFlux UI.");
  }
  const finalPrompt = `${request.prompt.trim()}, ${STYLE_TAGS[request.style]}`;
  const seed = Number.isFinite(request.seed) ? Number(request.seed) : Math.floor(Math.random() * 1e9) + index;
  const url = new URL("https://image.pollinations.ai/prompt/" + encodeURIComponent(finalPrompt));
  url.searchParams.set("model", "flux");
  url.searchParams.set("seed", String(seed));
  url.searchParams.set("nologo", "true");
  url.searchParams.set("private", "true");
  url.searchParams.set("enhance", "false");
  url.searchParams.set("safe", "false");
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${resolvedKey}`,
      Accept: "image/jpeg"
    }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Pollinations request failed (${response.status}): ${detail || response.statusText}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0;i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return {
    index,
    seed,
    prompt: finalPrompt,
    mimeType: response.headers.get("content-type") || "image/jpeg",
    dataUrl: `data:${response.headers.get("content-type") || "image/jpeg"};base64,${base64}`
  };
}
spindle.onFrontendMessage(async (raw, meta) => {
  if (!raw || raw.type !== "perflux:generate")
    return;
  try {
    const count = Math.max(1, Math.min(6, Number(raw.request.count || 1)));
    const jobs = Array.from({ length: count }, (_, index) => generateOne({ ...raw.request, count }, index, meta?.userId));
    spindle.sendToFrontend({ type: "perflux:status", status: "loading", count }, meta?.userId);
    const images = await Promise.all(jobs);
    spindle.sendToFrontend({ type: "perflux:results", images }, meta?.userId);
  } catch (error) {
    spindle.sendToFrontend({
      type: "perflux:error",
      message: error?.message || "Image generation failed."
    }, meta?.userId);
  }
});
