'use client'

import { useState, useCallback } from 'react'
import { X, Download, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { requestScreenshot } from './screenshot-helper'

const STYLES = [
  { id: 'modern', label: 'Modern', prompt: 'white smooth plaster walls, dark window frames, flat roof tiles, minimalist clean look, concrete paths' },
  { id: 'scandinavian', label: 'Skandinavisch', prompt: 'light wood cladding, white plaster, matte black window frames, simple landscaping, birch trees' },
  { id: 'industrial', label: 'Industrial', prompt: 'exposed concrete walls, dark steel window frames, metal roof panels, gravel ground, raw materials' },
  { id: 'mediterranean', label: 'Mediterran', prompt: 'warm ochre/terracotta wall paint, clay roof tiles, wooden shutters, stone path, olive trees and lavender' },
  { id: 'luxury', label: 'Luxus', prompt: 'premium stone facade, bronze window frames, slate roof, manicured garden, designer outdoor lighting' },
  { id: 'timber', label: 'Holzhaus', prompt: 'natural timber facade, wooden window frames, wooden shingle roof, wildflower garden, rustic charm' },
] as const

const TIME_OF_DAY = [
  { id: 'morning', label: '🌅 Morgen', prompt: 'early morning light, soft warm sunrise, long shadows, dewy fresh atmosphere' },
  { id: 'midday', label: '☀️ Mittag', prompt: 'bright midday sun, clear harsh light, short shadows, vivid colors' },
  { id: 'golden', label: '🌇 Golden Hour', prompt: 'golden hour warm light, long dramatic shadows, orange/amber tones, magic hour photography' },
  { id: 'dusk', label: '🌆 Dämmerung', prompt: 'blue hour dusk, interior lights glowing warmly through windows, deep blue sky, twilight' },
  { id: 'night', label: '🌙 Nacht', prompt: 'nighttime, building illuminated by warm interior lights and landscape lighting, dark sky with stars' },
] as const

const SEASONS = [
  { id: 'spring', label: '🌸 Frühling', prompt: 'spring season, blooming flowers, fresh green leaves, cherry blossoms, bright green lawn' },
  { id: 'summer', label: '☀️ Sommer', prompt: 'summer season, lush green vegetation, full canopy trees, vibrant garden, blue sky' },
  { id: 'autumn', label: '🍂 Herbst', prompt: 'autumn season, orange and red foliage, fallen leaves, warm golden tones, cozy atmosphere' },
  { id: 'winter', label: '❄️ Winter', prompt: 'WINTER with SNOW. Thick white snow covering the entire roof and ground. Snow everywhere. Bare trees without leaves. Frost on windows. Cold winter atmosphere. Everything covered in white snow.' },
] as const

const PROMPT_PRESETS = [
  { label: '🏡 Skandinavisch Modern', value: 'Bitte ein realistisches Rendering dieses Hauses erstellen in skandinavischem Design. Modern. Proportionen und Architektur beibehalten.' },
  { label: '🌿 Naturnah & Warm', value: 'Fotorealistisches Rendering mit warmen, natürlichen Materialien. Garten mit Bäumen und Pflanzen. Einladende, gemütliche Atmosphäre. Proportionen exakt beibehalten.' },
  { label: '✨ Luxus-Architektur', value: 'Hochwertiges architektonisches Rendering. Edle Materialien, gepflegter Garten, Abendbeleuchtung. Proportionen und Bauform identisch beibehalten.' },
  { label: '🏙️ Minimalistisch', value: 'Klares, minimalistisches Rendering. Weiße Putzfassade, schlichte Bepflanzung, klare Linien. Architektur und Proportionen exakt beibehalten.' },
] as const

type RenderStyle = typeof STYLES[number]['id']
type TimeOfDay = typeof TIME_OF_DAY[number]['id'] | null
type Season = typeof SEASONS[number]['id'] | null

interface AiRenderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AiRenderModal({ isOpen, onClose }: AiRenderModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<RenderStyle>('modern')
  const [selectedTime, setSelectedTime] = useState<TimeOfDay>(null)
  const [selectedSeason, setSelectedSeason] = useState<Season>(null)
  const [userPrompt, setUserPrompt] = useState('')
  const [isRendering, setIsRendering] = useState(false)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const buildExtraPrompt = useCallback(() => {
    const parts: string[] = []
    if (selectedTime) {
      const t = TIME_OF_DAY.find(t => t.id === selectedTime)
      if (t) parts.push(t.prompt)
    }
    if (selectedSeason) {
      const s = SEASONS.find(s => s.id === selectedSeason)
      if (s) parts.push(s.prompt)
    }
    if (userPrompt.trim()) parts.push(userPrompt.trim())
    return parts.join('. ')
  }, [selectedTime, selectedSeason, userPrompt])

  const handleRender = useCallback(async () => {
    setIsRendering(true)
    setError(null)
    setResultImage(null)

    try {
      const screenshot = await requestScreenshot()
      const base64Image = screenshot.split(',')[1] ?? ''
      if (!base64Image || base64Image.length < 1000) {
        throw new Error('Canvas capture returned empty image')
      }

      const style = STYLES.find(s => s.id === selectedStyle)!
      const response = await fetch('/api/ai-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          stylePrompt: style.prompt,
          styleName: style.label,
          userPrompt: buildExtraPrompt(),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Render failed' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setResultImage(data.image)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render failed')
    } finally {
      setIsRendering(false)
    }
  }, [selectedStyle, buildExtraPrompt])

  const handleRefine = useCallback(async () => {
    if (!resultImage || !userPrompt.trim()) return
    setIsRendering(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: resultImage,
          stylePrompt: STYLES.find(s => s.id === selectedStyle)!.prompt,
          styleName: STYLES.find(s => s.id === selectedStyle)!.label,
          userPrompt: userPrompt.trim(),
          isRefinement: true,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Refinement failed' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setResultImage(data.image)
      setUserPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed')
    } finally {
      setIsRendering(false)
    }
  }, [resultImage, userPrompt, selectedStyle])

  const handleDownload = useCallback(() => {
    if (!resultImage) return
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${resultImage}`
    link.download = `ai-render-${selectedStyle}-${Date.now()}.png`
    link.click()
  }, [resultImage, selectedStyle])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">AI Render</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {!resultImage && (
            <>
              {/* Stil */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Stil</p>
                <div className="grid grid-cols-3 gap-2">
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      disabled={isRendering}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                        selectedStyle === style.id
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10'
                      } ${isRendering ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tageszeit */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Tageszeit</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_OF_DAY.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTime(selectedTime === t.id ? null : t.id)}
                      disabled={isRendering}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                        selectedTime === t.id
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                      } ${isRendering ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jahreszeit */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Jahreszeit</p>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSeason(selectedSeason === s.id ? null : s.id)}
                      disabled={isRendering}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                        selectedSeason === s.id
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                      } ${isRendering ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Presets + Freitext */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Prompt (optional)</p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {PROMPT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setUserPrompt(preset.value)}
                      disabled={isRendering}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300 disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  disabled={isRendering}
                  placeholder="z.B. Proporionen und Architektur beibehalten. Pool im Garten hinzufügen..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500/50 focus:bg-white/10 disabled:opacity-50"
                />
              </div>
            </>
          )}

          {/* Loading */}
          {isRendering && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
              <p className="text-sm text-zinc-400">Rendering wird generiert...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Result */}
          {resultImage && (
            <div className="space-y-4">
              <img
                src={`data:image/png;base64,${resultImage}`}
                alt="AI Render"
                className="w-full rounded-xl border border-white/10 shadow-lg"
              />
              {/* Refinement */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Anpassungen</label>
                <div className="flex gap-2">
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    disabled={isRendering}
                    placeholder="z.B. Dach in rot, Holzfassade, Pool im Garten..."
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && userPrompt.trim()) {
                        e.preventDefault()
                        handleRefine()
                      }
                    }}
                    className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:bg-white/10 disabled:opacity-50"
                  />
                  <button
                    onClick={handleRefine}
                    disabled={isRendering || !userPrompt.trim()}
                    className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Anpassen</span>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <div className="text-xs text-zinc-500">Powered by Gemini</div>
          <div className="flex gap-2">
            {resultImage && (
              <>
                <button
                  onClick={() => { setResultImage(null); setError(null); setUserPrompt('') }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Neues Rendering
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </>
            )}
            {!resultImage && (
              <button
                onClick={handleRender}
                disabled={isRendering}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Rendering generieren
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
