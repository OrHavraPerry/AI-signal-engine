import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { hasSession, unauthorized } from '@/lib/auth';
import { getLatestBrief } from '@/lib/brief';
import {
  DEFAULT_OPENAI_TTS_MODEL,
  OPENAI_TTS_MODELS,
  createBriefTtsScript,
  supportsSpeakerInstructions,
} from '@/lib/tts';

export const dynamic = 'force-dynamic';

const BriefTtsRequestSchema = z.object({
  model: z.enum(OPENAI_TTS_MODELS).default(DEFAULT_OPENAI_TTS_MODEL),
  speakerInstructions: z.string().max(1000).default(''),
});

export async function POST(req: NextRequest) {
  if (!hasSession(req)) return unauthorized();

  const parsed = BriefTtsRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: 'invalid payload' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 400 });
  }

  const brief = getLatestBrief();
  if (!brief) {
    return Response.json({ error: 'No brief has been generated yet' }, { status: 404 });
  }

  const { model, speakerInstructions } = parsed.data;
  const ttsInstructions = [
    'Read this as a concise personal findings brief, not a document export. Use natural pacing, emphasize what was found, why it matters, and what needs verification. Avoid creator, video, thumbnail, graph, or publishing language.',
    speakerInstructions.trim(),
  ]
    .filter(Boolean)
    .join(' ');
  const payload: Record<string, unknown> = {
    model,
    input: createBriefTtsScript(brief),
    voice: 'coral',
    response_format: 'mp3',
  };

  if (supportsSpeakerInstructions(model)) {
    payload.instructions = ttsInstructions;
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return Response.json(
      {
        error: 'OpenAI TTS request failed',
        status: response.status,
        detail: detail.slice(0, 600),
      },
      { status: 502 },
    );
  }

  const audio = await response.arrayBuffer();
  const date = brief.generated_at.slice(0, 10);
  return new Response(audio, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="findings-brief-${date}.mp3"`,
      'Cache-Control': 'no-store',
    },
  });
}
