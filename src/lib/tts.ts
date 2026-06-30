import type { CreatorBrief } from './types';

export const OPENAI_TTS_MODELS = ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'] as const;

export type OpenAITtsModel = (typeof OPENAI_TTS_MODELS)[number];

export const DEFAULT_OPENAI_TTS_MODEL: OpenAITtsModel = 'gpt-4o-mini-tts';

export function supportsSpeakerInstructions(model: OpenAITtsModel): boolean {
  return model === 'gpt-4o-mini-tts';
}

function sentenceList(items: string[], limit: number): string {
  return items
    .slice(0, limit)
    .map((item, index) => `${index + 1}. ${item}`)
    .join(' ');
}

export function createBriefTtsScript(brief: CreatorBrief): string {
  const leadBundle = brief.bundles[0];
  const sourceNames = brief.sources
    .slice(0, 4)
    .map((source) => source.name)
    .join(', ');

  const sections = [
    `Here is the creator brief for ${new Date(brief.generated_at).toLocaleString()}.`,
    `The short version: ${brief.executive_summary}`,
    `The best video angle is this: ${brief.strongest_angle}`,
    leadBundle
      ? `The main story cluster to watch is ${leadBundle.name}. ${leadBundle.summary} The arc is: ${leadBundle.story_arc}`
      : '',
    brief.title_ideas.length > 0
      ? `For packaging, the strongest title options are: ${sentenceList(brief.title_ideas, 3)}`
      : '',
    brief.talking_points.length > 0
      ? `In the actual video, hit these beats: ${sentenceList(brief.talking_points, 5)}`
      : '',
    brief.verification_checklist.length > 0
      ? `Before filming, do not skip the trust check. Verify: ${sentenceList(brief.verification_checklist, 5)}`
      : 'No elevated verification items are currently listed, but primary sources still need a final human check.',
    brief.risky_claims.length > 0
      ? `Important caution: ${sentenceList(brief.risky_claims, 3)}`
      : '',
    sourceNames ? `Primary sources on the board include ${sourceNames}.` : '',
    'End of voice brief.',
  ];

  return sections.filter(Boolean).join('\n\n').slice(0, 4000);
}
