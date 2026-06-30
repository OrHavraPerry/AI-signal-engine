import type { CreatorBrief } from './types';

export const OPENAI_TTS_MODELS = ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'] as const;

export type OpenAITtsModel = (typeof OPENAI_TTS_MODELS)[number];

export const DEFAULT_OPENAI_TTS_MODEL: OpenAITtsModel = 'gpt-4o-mini-tts';

export function supportsSpeakerInstructions(model: OpenAITtsModel): boolean {
  return model === 'gpt-4o-mini-tts';
}

export function createBriefTtsScript(brief: CreatorBrief): string {
  const sections = [
    `AI Signal Engine creator brief, generated ${new Date(brief.generated_at).toLocaleString()}.`,
    `Executive summary. ${brief.executive_summary}`,
    `Strongest video angle. ${brief.strongest_angle}`,
    brief.title_ideas.length > 0
      ? `Title ideas. ${brief.title_ideas.map((title, index) => `${index + 1}. ${title}`).join(' ')}`
      : '',
    brief.talking_points.length > 0
      ? `Key talking points. ${brief.talking_points.slice(0, 6).join(' ')}`
      : '',
    brief.verification_checklist.length > 0
      ? `Before filming, verify these claims. ${brief.verification_checklist.slice(0, 6).join(' ')}`
      : 'No elevated verification items are currently listed, but primary sources still need a final human check.',
  ];

  return sections.filter(Boolean).join('\n\n').slice(0, 4000);
}
