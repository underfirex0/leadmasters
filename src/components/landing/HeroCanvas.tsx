'use client'
import { useEffect, useRef } from 'react'

const COLORS = ['#818CF8','#6366F1','#4F46E5','#A5B4FC','#C7D2FE','#E0E7FF']

interface Particle {
  x: number; y: number
  vx: number; vy: number
  r: number; opacity: number
  phase: number; color: string
}

export default function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let w = 0, h = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width  = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Build particle field — clustered to mimic Moroccan city density
    const particles: Particle[] = Array.from({ length: 180 }, () => ({
      x:       Math.random() * w,
      y:       Math.random() * h,
      vx:      (Math.random() - 0.5) * 0.18,
      vy:      (Math.random() - 0.5) * 0.12,
      r:       0.8 + Math.random() * 2.2,
      opacity: 0.18 + Math.random() * 0.45,
      phase:   Math.random() * Math.PI * 2,
      color:   COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    let t = 0
    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      t += 0.007

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy + Math.sin(t + p.phase) * 0.06

        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        ctx.globalAlpha = p.opacity * (0.65 + Math.sin(t * 0.6 + p.phase) * 0.35)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  )
}
