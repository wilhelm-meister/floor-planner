'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lora } from 'next/font/google'
import { PenLine, Box, Share2, Layers, Sofa, Lightbulb, DoorOpen, Building2, Link2 } from 'lucide-react'
import { getPublicProjects } from '../../community/lib/projects/actions'
import type { Project } from '../../community/lib/projects/types'
import { SignInDialog } from '../../community/components/sign-in-dialog'

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lora',
  display: 'swap',
})

const FEATURES: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }[] = [
  {
    icon: Layers,
    title: 'Walls & Rooms',
    desc: 'Draw walls and import floor plans with precision',
  },
  {
    icon: Sofa,
    title: 'Furniture & Objects',
    desc: 'Place hundreds of 3D items from the built-in catalog',
  },
  {
    icon: Lightbulb,
    title: 'Lighting & Zones',
    desc: 'Define room zones and lighting conditions',
  },
  {
    icon: DoorOpen,
    title: 'Doors & Windows',
    desc: 'Snap doors and windows to walls with one click',
  },
  {
    icon: Building2,
    title: 'Multi-Level',
    desc: 'Design full buildings with multiple floors',
  },
  {
    icon: Link2,
    title: 'Share Anywhere',
    desc: 'Share a direct link — no login required to view',
  },
]

const STEPS = [
  {
    number: '01',
    icon: PenLine,
    title: 'Draw your floor plan',
    desc: 'Place walls, doors, and windows in minutes',
  },
  {
    number: '02',
    icon: Box,
    title: 'Visualize in 3D',
    desc: 'Walk through your building in real time',
  },
  {
    number: '03',
    icon: Share2,
    title: 'Share & Export',
    desc: 'Share your project or export as image',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  useEffect(() => {
    getPublicProjects().then((result) => {
      if (result.success && result.data) {
        setProjects(result.data.slice(0, 6))
      }
      setLoadingProjects(false)
    })
  }, [])

  return (
    <div className={`${lora.variable} min-h-screen`}>
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-stone-900/90 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image
              src="/pascal-logo-shape.svg"
              alt="Wilhelm Editor"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            <span className="text-lg font-semibold tracking-tight text-white">Wilhelm Editor</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSignInOpen(true)}
              className="bg-white text-stone-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative bg-stone-900 pt-24 pb-32 px-6 overflow-hidden">
        {/* Fullscreen video background */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="https://unreal.house/wp-content/uploads/2024/07/unreal-engine-5-real-estate-configurator.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative container mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Open Source · Free Forever
          </div>

          {/* Headline */}
          <h1 className="font-[family-name:var(--font-lora)] text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tight text-white mb-6">
            Design your home.
            <br />
            <span className="text-white/50 italic">In 3D.</span>
          </h1>

          {/* Subline */}
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            The free, open-source 3D floor plan editor. Draw walls, place furniture, share your vision.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => router.push('/editor/demo')}
              className="bg-white text-stone-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-colors w-full sm:w-auto"
            >
              Start designing
            </button>
            <button
              onClick={() => setIsSignInOpen(true)}
              className="border border-white/20 text-white/80 font-semibold px-8 py-3.5 rounded-xl hover:bg-white/5 transition-colors w-full sm:w-auto"
            >
              Sign in
            </button>
          </div>


        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-[family-name:var(--font-lora)] text-4xl font-bold text-stone-900 text-center mb-4">
            How it works
          </h2>
          <p className="text-stone-500 text-center mb-16 text-lg">
            From blank canvas to finished floor plan in three steps
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.number} className="flex flex-col items-start gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-bold text-stone-200 font-[family-name:var(--font-lora)] leading-none">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-stone-700" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-stone-900 mb-1">{step.title}</h3>
                    <p className="text-stone-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────────────── */}
      <section className="py-24 px-6 bg-stone-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-[family-name:var(--font-lora)] text-4xl font-bold text-stone-900 text-center mb-4">
            Everything you need
          </h2>
          <p className="text-stone-500 text-center mb-16 text-lg">
            Professional tools, completely free
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-6 border border-stone-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default"
                >
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-stone-700" />
                  </div>
                  <h3 className="font-semibold text-stone-900 mb-2">{feature.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── COMMUNITY GALERIE ───────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-[family-name:var(--font-lora)] text-4xl font-bold text-stone-900 text-center mb-4">
            Community Projects
          </h2>
          <p className="text-stone-500 text-center mb-16 text-lg">
            Get inspired by what others have built
          </p>

          {loadingProjects ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-stone-100 rounded-2xl aspect-[4/3] animate-pulse" />
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/viewer/${project.id}`)}
                  className="group text-left"
                >
                  <div className="relative aspect-[4/3] rounded-2xl bg-stone-100 overflow-hidden border border-stone-100 group-hover:border-stone-300 transition-colors">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="font-medium text-stone-900 text-sm truncate">{project.name}</h3>
                    {project.owner && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">
                        {project.owner.username || project.owner.name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-stone-200 rounded-2xl aspect-[4/3]" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA SECTION ─────────────────────────────────────── */}
      <section className="py-24 px-6 bg-stone-900">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-lora)] text-4xl font-bold text-white mb-4">
            Ready to start?
          </h2>
          <p className="text-stone-400 text-lg mb-10">
            Free, no installation required, runs entirely in your browser.
          </p>
          <button
            onClick={() => router.push('/editor/demo')}
            className="bg-white text-stone-900 font-semibold px-10 py-4 rounded-xl text-lg hover:bg-stone-100 transition-colors"
          >
            Start designing
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-stone-200 bg-stone-50">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-stone-400">
          <span>© 2026 Wilhelm Editor · Open Source</span>
          <a
            href="https://github.com/wilhelm-meister/floor-planner"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-stone-700 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>

      {/* Sign In Dialog */}
      <SignInDialog open={isSignInOpen} onOpenChange={setIsSignInOpen} />
    </div>
  )
}
