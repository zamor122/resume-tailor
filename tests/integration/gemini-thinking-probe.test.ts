
import { describe, it } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function call(modelId: string, generationConfig: Record<string, unknown>) {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: modelId });
  const t0 = Date.now();
  try {
    const r = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
      generationConfig,
    });
    return { ok: true, ms: Date.now() - t0, text: r.response.text().slice(0, 20) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, ms: Date.now() - t0, err: msg.slice(0, 220) };
  }
}

describe('gemini thinkingConfig support probe', () => {
  it('flash-lite and flash, with and without thinkingConfig', async () => {
    console.log('lite plain       :', JSON.stringify(await call('gemini-2.5-flash-lite', { maxOutputTokens: 32, temperature: 0.2 })));
    console.log('lite thinking=0  :', JSON.stringify(await call('gemini-2.5-flash-lite', { maxOutputTokens: 32, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } })));
    console.log('flash plain      :', JSON.stringify(await call('gemini-2.5-flash', { maxOutputTokens: 32, temperature: 0.2 })));
    console.log('flash thinking=0 :', JSON.stringify(await call('gemini-2.5-flash', { maxOutputTokens: 32, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } })));
  }, 120_000);
});
