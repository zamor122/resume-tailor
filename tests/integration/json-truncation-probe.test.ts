
import { describe, it } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PROMPT = `Rewrite these 3 resume bullets to align with the job description. Return ONLY a JSON array, no prose, no markdown fences.
JD: Senior software engineer, distributed systems, Kubernetes, observability.
Bullets:
1. Worked on the shipment tracking dashboard used by internal operations teams.
2. Helped migrate some services to a containerised deployment on AWS.
3. Reviewed code for two junior engineers and participated in sprint planning.
JSON schema: [{"index":0,"original":"...","rewritten":"...","reason":"..."}]`;

async function probe(modelId: string, generationConfig: Record<string, unknown>) {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: modelId });
  const r = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
    generationConfig,
  });
  const resp = r.response;
  const text = resp.text();
  return {
    finishReason: resp.candidates?.[0]?.finishReason,
    usage: resp.usageMetadata,
    chars: text.length,
    tail: JSON.stringify(text.slice(-70)),
    validJson: (() => { try { JSON.parse(text.trim()); return true; } catch { return false; } })(),
    fenced: text.includes('```'),
  };
}

describe('gemini-2.5-flash JSON output probe', () => {
  it('compares thinking-default vs thinking-disabled at maxOutputTokens=2000', async () => {
    const withThinking = await probe('gemini-2.5-flash', { maxOutputTokens: 2000, temperature: 0.2 });
    console.log('=== WITH THINKING (current behaviour) ===\n' + JSON.stringify(withThinking, null, 2));

    const noThinking = await probe('gemini-2.5-flash', { maxOutputTokens: 2000, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } });
    console.log('=== THINKING DISABLED ===\n' + JSON.stringify(noThinking, null, 2));
  }, 120_000);
});
