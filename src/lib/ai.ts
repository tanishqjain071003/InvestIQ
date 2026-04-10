import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiKey = process.env.GEMINI_API_KEY;

let gemini: GoogleGenerativeAI | null = null;
if (geminiKey) {
  gemini = new GoogleGenerativeAI(geminiKey);
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

async function tryGemini(prompt: string, maxTokens: number): Promise<string | null> {
  if (!gemini) return null;

  for (const modelName of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        });
        return result.response.text();
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 503 || status === 429) {
          // Backoff: 1s, 3s, then give up on this model
          await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
          continue;
        }
        if (status === 404) break; // model doesn't exist, try next
        throw err;
      }
    }
  }
  return null;
}

// Fallback: call Groq (free, no key needed for small usage) via their REST API
async function tryGroq(prompt: string): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// Fallback: OpenRouter (free models available)
async function tryOpenRouter(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function generateAIResponse(prompt: string, maxTokens = 1500): Promise<string> {
  // 1. Gemini (free, best quality)
  const geminiResult = await tryGemini(prompt, maxTokens);
  if (geminiResult) return geminiResult;

  // 2. Groq (free, fast, needs key)
  const groqResult = await tryGroq(prompt);
  if (groqResult) return groqResult;

  // 3. OpenRouter free tier (no key needed)
  const openRouterResult = await tryOpenRouter(prompt);
  if (openRouterResult) return openRouterResult;

  // 4. Anthropic (paid fallback)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch { /* no credits */ }
  }

  throw new Error('AI temporarily unavailable. Please try again in a moment.');
}
