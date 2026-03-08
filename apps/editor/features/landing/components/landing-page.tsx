'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lora } from 'next/font/google'
import {
  PenLine, Box, Share2, Layers, Sofa, Lightbulb, DoorOpen, Building2, Link2,
  Home, Ruler, BookOpen, Menu, X, ChevronDown, Code2, Globe, CheckCircle, Users,
} from 'lucide-react'
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

const USE_CASES = [
  {
    icon: Home,
    title: 'Homeowners',
    desc: 'Plan your dream home before breaking ground',
  },
  {
    icon: Ruler,
    title: 'Architects & Planners',
    desc: 'Present concepts to clients with real-time 3D',
  },
  {
    icon: Sofa,
    title: 'Interior Designers',
    desc: 'Visualize furniture layouts before purchasing',
  },
  {
    icon: Building2,
    title: 'Real Estate',
    desc: 'Create compelling property visualizations',
  },
]

const STATS = [
  { icon: CheckCircle, label: '100% Free', sub: 'No credit card ever' },
  { icon: Code2, label: 'Open Source', sub: 'MIT licensed on GitHub' },
  { icon: Globe, label: 'No Installation', sub: 'Runs in your browser' },
  { icon: Link2, label: 'Shareable Links', sub: 'Viewers need no account' },
]

const FAQS = [
  {
    q: 'Is Wilhelm Editor really free?',
    a: 'Yes, completely free. No credit card, no subscription, no hidden limits. Wilhelm Editor is open source and free forever — for personal and commercial projects alike.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Wilhelm Editor runs entirely in your browser. No desktop app, no plugins, no setup. Open the link and start designing immediately.',
  },
  {
    q: 'Can I share my floor plan?',
    a: 'Yes. Every project gets a shareable link. Viewers can explore your 3D floor plan without needing an account or installing anything.',
  },
  {
    q: 'What file formats can I import?',
    a: 'You can import floor plan images (JPG, PNG) as a reference layer to trace over. We are working on support for additional formats.',
  },
  {
    q: 'Is my data safe?',
    a: 'Your projects are saved to your account via secure cloud storage. Your data is never shared or sold. You can delete your account and all data at any time.',
  },
  {
    q: 'Can I use it on mobile or tablet?',
    a: 'The best experience is on desktop. Tablet support is coming soon. Mobile devices are not yet supported for editing, but you can view shared projects on any device.',
  },
]

const GUIDES = [
  {
    icon: BookOpen,
    title: 'Getting Started: Draw your first floor plan in 10 minutes',
    tag: 'Beginner',
  },
  {
    icon: Layers,
    title: 'How to use multi-level buildings',
    tag: 'Intermediate',
  },
  {
    icon: Share2,
    title: 'Sharing & exporting your projects',
    tag: 'Tips',
  },
]

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Community', href: '/' },
  { label: 'Guides', href: '/guides' },
]

export default function LandingPage() {
  const router = useRouter()
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-6">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/pascal-logo-shape.svg"
              alt="Wilhelm Editor"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            <span className="text-lg font-semibold tracking-tight text-white">Wilhelm Editor</span>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right: Sign In + hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSignInOpen(true)}
              className="bg-white text-stone-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              Sign In
            </button>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-stone-900/95 px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-white/70 hover:text-white transition-colors py-1"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative bg-stone-900 min-h-screen flex items-center px-6 overflow-hidden">
        {/* Fullscreen video background */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="https://unreal.house/wp-content/uploads/2024/07/unreal-engine-5-real-estate-configurator.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/75" />

        <div className="relative container mx-auto max-w-5xl text-center py-32">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Open Source · Free Forever
          </div>

          {/* Headline */}
          <h1 className="font-[family-name:var(--font-lora)] text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tight text-white mb-6">
            Design your home.
            <br />
            <span className="text-white/75 italic">In 3D.</span>
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
      <section id="how-it-works" className="py-24 px-6 bg-white">
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
      <section id="features" className="py-24 px-6 bg-stone-50">
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

      {/* ── USE CASES ───────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-[family-name:var(--font-lora)] text-4xl font-bold text-stone-900 text-center mb-4">
            Built for everyone who designs spaces
          </h2>
          <p className="text-stone-500 text-center mb-16 text-lg">
            Whether you are a homeowner or a professional — Wilhelm Editor adapts to your workflow
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon
              return (
                <div
                  key={uc.title}
                  className="flex flex-col items-start gap-4 p-6 rounded-2xl border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-1">{uc.title}</h3>
                    <p className="text-stone-500 text-sm leading-relaxed">{uc.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section className="py-16 px-6 bg-stone-900">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="flex flex-col items-center text-center gap-2">
                  <Icon className="w-6 h-6 text-green-400" />
                  <span className="text-white font-semibold text-lg">{stat.label}</span>
                  <span className="text-stone-400 text-sm">{stat.sub}</span>
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

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-stone-50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-lora)] text-4xl font-bold text-stone-900 text-center mb-4">
            Frequently asked questions
          </h2>
          <p className="text-stone-500 text-center mb-16 text-lg">
            Everything you need to know about Wilhelm Editor
          </p>

          <div className="flex flex-col divide-y divide-stone-200 border border-stone-200 rounded-2xl overflow-hidden bg-white">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-stone-50 transition-colors"
                >
                  <span className="font-medium text-stone-900">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-stone-400 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-stone-500 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUIDES TEASER ───────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <h2 className="font-[family-name:var(--font-lora)] text-4xl font-bold text-stone-900 mb-2">
                Guides &amp; Tutorials
              </h2>
              <p className="text-stone-500 text-lg">
                Learn how to get the most out of Wilhelm Editor
              </p>
            </div>
            <a
              href="/guides"
              className="shrink-0 text-sm font-medium text-stone-700 hover:text-stone-900 underline underline-offset-4 transition-colors"
            >
              View all guides →
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {GUIDES.map((guide) => {
              const Icon = guide.icon
              return (
                <a
                  key={guide.title}
                  href="/guides"
                  className="group flex flex-col gap-4 p-6 rounded-2xl border border-stone-100 hover:border-stone-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                    <Icon className="w-5 h-5 text-stone-600" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                      {guide.tag}
                    </span>
                    <h3 className="font-semibold text-stone-900 text-sm leading-snug group-hover:text-stone-700 transition-colors">
                      {guide.title}
                    </h3>
                  </div>
                  <span className="text-xs text-stone-400 group-hover:text-stone-600 transition-colors">
                    Coming soon
                  </span>
                </a>
              )
            })}
          </div>
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
      <footer className="bg-stone-900 px-6 pt-16 pb-8">
        <div className="container mx-auto max-w-5xl">
          {/* 4-column grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Col 1: Brand */}
            <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/pascal-logo-shape.svg"
                  alt="Wilhelm Editor"
                  width={24}
                  height={24}
                  className="w-6 h-6 opacity-80"
                />
                <span className="text-white font-semibold tracking-tight">Wilhelm Editor</span>
              </div>
              <p className="text-stone-400 text-sm leading-relaxed">
                The free, open-source 3D floor plan editor for everyone.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Open Source
              </span>
            </div>

            {/* Col 2: Product */}
            <div className="flex flex-col gap-3">
              <span className="text-white text-sm font-semibold mb-1">Product</span>
              <a href="/editor/demo" className="text-stone-400 text-sm hover:text-white transition-colors">Editor</a>
              <a href="/" className="text-stone-400 text-sm hover:text-white transition-colors">Community</a>
              <a href="#" className="text-stone-400 text-sm hover:text-white transition-colors">Changelog</a>
              <a href="#" className="text-stone-400 text-sm hover:text-white transition-colors">Roadmap</a>
            </div>

            {/* Col 3: Resources */}
            <div className="flex flex-col gap-3">
              <span className="text-white text-sm font-semibold mb-1">Resources</span>
              <a href="/guides" className="text-stone-400 text-sm hover:text-white transition-colors">Guides</a>
              <a
                href="https://github.com/wilhelm-meister/floor-planner"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 text-sm hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a href="#" className="text-stone-400 text-sm hover:text-white transition-colors">Roadmap</a>
            </div>

            {/* Col 4: Legal */}
            <div className="flex flex-col gap-3">
              <span className="text-white text-sm font-semibold mb-1">Legal</span>
              <a href="/privacy" className="text-stone-400 text-sm hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="text-stone-400 text-sm hover:text-white transition-colors">Terms</a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-stone-500">
            <span>© 2026 Wilhelm Editor · Built with ♥ · Open Source</span>
            <a
              href="https://github.com/wilhelm-meister/floor-planner"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-stone-300 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* Sign In Dialog */}
      <SignInDialog open={isSignInOpen} onOpenChange={setIsSignInOpen} />
    </div>
  )
}
