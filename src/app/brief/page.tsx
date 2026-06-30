'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { briefToMarkdown } from '@/lib/markdown';
import {
  DEFAULT_OPENAI_TTS_MODEL,
  OPENAI_TTS_MODELS,
  supportsSpeakerInstructions,
  type OpenAITtsModel,
} from '@/lib/tts';
import type { CreatorBrief } from '@/lib/types';

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="glass p-5">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function BriefPage() {
  const [brief, setBrief] = useState<CreatorBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [ttsModel, setTtsModel] = useState<OpenAITtsModel>(DEFAULT_OPENAI_TTS_MODEL);
  const [speakerInstructions, setSpeakerInstructions] = useState(
    'Sound like a sharp tech-news YouTube narrator: calm, curious, and credible. Keep the pacing tight.',
  );
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsError, setTtsError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  useEffect(() => {
    fetch('/api/brief')
      .then((r) => (r.ok ? r.json() : { brief: null }))
      .then((d: { brief: CreatorBrief | null }) => setBrief(d.brief))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const regenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/brief', { method: 'POST' });
      if (res.ok) {
        const d = (await res.json()) as { brief: CreatorBrief };
        setBrief(d.brief);
        setTtsError('');
        setAudioUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return '';
        });
      }
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateTts = useCallback(async () => {
    if (!brief) return;
    setTtsGenerating(true);
    setTtsError('');
    try {
      const res = await fetch('/api/brief/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ttsModel,
          speakerInstructions: supportsSpeakerInstructions(ttsModel) ? speakerInstructions : '',
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
        setTtsError(body?.error ?? 'TTS generation failed');
        return;
      }

      const blob = await res.blob();
      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
    } finally {
      setTtsGenerating(false);
    }
  }, [brief, speakerInstructions, ttsModel]);

  function exportMarkdown() {
    if (!brief) return;
    const blob = new Blob([briefToMarkdown(brief)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creator-brief-${brief.generated_at.slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="glass flex flex-wrap items-center gap-3 px-5 py-4">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-xl font-bold text-transparent">
            Creator Brief
          </h1>
          {brief && (
            <p className="text-xs text-slate-500">
              Generated {new Date(brief.generated_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={regenerate}
            disabled={generating}
            className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-40"
          >
            {generating ? 'Generating…' : '✦ Regenerate'}
          </button>
          <button
            onClick={exportMarkdown}
            disabled={!brief}
            className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700/60 disabled:opacity-40"
          >
            ↓ Export as Markdown
          </button>
          <Link href="/" className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            ← Dashboard
          </Link>
        </div>
      </header>

      {loading && <p className="px-2 text-sm text-slate-500">Loading…</p>}

      {!loading && !brief && (
        <div className="glass p-10 text-center">
          <p className="text-sm text-slate-400">No brief generated yet.</p>
          <button
            onClick={regenerate}
            disabled={generating}
            className="mt-4 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-40"
          >
            {generating ? 'Generating…' : 'Generate from current board'}
          </button>
        </div>
      )}

      {brief && (
        <>
          <Section title="Voiceover TTS" accent="#22d3ee">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                OpenAI model
                <select
                  value={ttsModel}
                  onChange={(event) => setTtsModel(event.target.value as OpenAITtsModel)}
                  className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm normal-case tracking-normal text-slate-100 outline-none transition focus:border-cyan-400"
                >
                  {OPENAI_TTS_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  onClick={generateTts}
                  disabled={!brief || ttsGenerating}
                  className="w-full rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:brightness-110 disabled:opacity-40"
                >
                  {ttsGenerating ? 'Generating audio…' : 'Generate TTS'}
                </button>
              </div>
            </div>

            <label className="mt-4 grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Speaker instructions
              <textarea
                value={speakerInstructions}
                onChange={(event) => setSpeakerInstructions(event.target.value)}
                disabled={!supportsSpeakerInstructions(ttsModel)}
                rows={3}
                className="resize-y rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm normal-case leading-relaxed tracking-normal text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">
              {supportsSpeakerInstructions(ttsModel)
                ? 'Speaker instructions are sent to OpenAI for this model.'
                : 'This OpenAI model does not support speaker instructions, so the textbox is disabled.'}
            </p>

            {ttsError && <p className="mt-3 text-sm text-rose-300">{ttsError}</p>}
            {audioUrl && (
              <div className="mt-4 grid gap-3 rounded-lg border border-slate-700/50 bg-slate-950/35 p-3">
                <audio controls src={audioUrl} className="w-full" />
                <a
                  href={audioUrl}
                  download={`creator-brief-${brief.generated_at.slice(0, 10)}.mp3`}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300 hover:underline"
                >
                  Download MP3
                </a>
              </div>
            )}
          </Section>

          <Section title="Executive Summary" accent="#22d3ee">
            <p className="text-sm leading-relaxed text-slate-200">{brief.executive_summary}</p>
          </Section>

          <Section title="Strongest Video Angle" accent="#34d399">
            <p className="text-sm font-medium leading-relaxed text-emerald-200">{brief.strongest_angle}</p>
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Title Ideas" accent="#22d3ee">
              <ol className="space-y-2 text-sm text-slate-200">
                {brief.title_ideas.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-cyan-400">{i + 1}.</span> {t}
                  </li>
                ))}
              </ol>
            </Section>
            <Section title="Thumbnail Concepts" accent="#a78bfa">
              <ol className="space-y-2 text-sm text-slate-200">
                {brief.thumbnail_ideas.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-violet-400">{i + 1}.</span> {t}
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          <Section title="Story Bundles" accent="#fbbf24">
            <div className="space-y-4">
              {brief.bundles.length === 0 && <p className="text-sm text-slate-500">No bundles — board too sparse.</p>}
              {brief.bundles.map((b, i) => (
                <div key={b.id} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <h3 className="text-sm font-bold text-amber-200">
                    {i + 1}. {b.name}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{b.summary}</p>
                  <p className="mt-2 text-[12px] italic leading-relaxed text-slate-400">{b.story_arc}</p>
                  <div className="mt-3 grid gap-1 text-[12px] text-slate-300">
                    <p>
                      <span className="font-semibold text-cyan-300">Title:</span> {b.recommended_title}
                    </p>
                    <p>
                      <span className="font-semibold text-violet-300">Thumbnail:</span> {b.thumbnail_idea}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Segment Outline" accent="#60a5fa">
            <ul className="space-y-1.5 text-sm text-slate-200">
              {brief.segment_outline.map((s, i) => (
                <li key={i}>— {s}</li>
              ))}
            </ul>
          </Section>

          <Section title="Key Talking Points" accent="#34d399">
            <ul className="space-y-2 text-sm text-slate-200">
              {brief.talking_points.map((t, i) => (
                <li key={i}>• {t}</li>
              ))}
            </ul>
          </Section>

          <Section title="Verification Checklist" accent="#fbbf24">
            <ul className="space-y-1.5 text-sm text-slate-200">
              {brief.verification_checklist.length === 0 && (
                <li className="text-slate-500">Nothing flagged — still verify primary sources.</li>
              )}
              {brief.verification_checklist.map((v, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-400">☐</span> {v}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Risky Claims — Do Not Overstate" accent="#fb7185">
            <ul className="space-y-1.5 text-sm text-rose-200/90">
              {brief.risky_claims.length === 0 && <li className="text-slate-500">No elevated-risk claims on the board.</li>}
              {brief.risky_claims.map((r, i) => (
                <li key={i}>⚠ {r}</li>
              ))}
            </ul>
          </Section>

          <Section title="Sources" accent="#94a3b8">
            <ul className="space-y-1.5 text-sm">
              {brief.sources.map((s) => (
                <li key={s.url} className="truncate">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">
                    {s.name}
                  </a>
                  <span className="ml-2 text-xs text-slate-600">{s.url}</span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </main>
  );
}
