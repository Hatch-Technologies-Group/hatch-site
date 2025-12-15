import { cn } from '@/lib/utils'
import hatchLogoUrl from '@/assets/brand/hatch-logo.png'

type HatchLogoProps = {
  className?: string
  wordmark?: boolean
  alt?: string
}

const hatchLogo = '/hatch-logo.png'
const hatchLogoLegacy = '/hatch logo.png'

const fallbackSvg =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22 fill=%22none%22%3E%3Cdefs%3E%3ClinearGradient id=%22hatch-grad%22 x1=%2214%22 y1=%226%22 x2=%2252%22 y2=%2258%22 gradientUnits=%22userSpaceOnUse%22%3E%3Cstop stop-color=%22%232563EB%22/%3E%3Cstop offset=%221%22 stop-color=%22%2322D3EE%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x=%224%22 y=%224%22 width=%2256%22 height=%2256%22 rx=%2214%22 fill=%22url(%23hatch-grad)%22/%3E%3Crect x=%2220%22 y=%2218%22 width=%228%22 height=%2228%22 rx=%222%22 fill=%22white%22/%3E%3Crect x=%2236%22 y=%2218%22 width=%228%22 height=%2228%22 rx=%222%22 fill=%22white%22/%3E%3Crect x=%2220%22 y=%2230%22 width=%2224%22 height=%228%22 rx=%222%22 fill=%22white%22/%3E%3C/svg%3E'

export function HatchLogo({ className, wordmark = true, alt = 'Hatch logo' }: HatchLogoProps) {
  // Prefer a bundled asset (Vite), then public paths, then inline SVG.
  const sources = [hatchLogoUrl, hatchLogo, hatchLogoLegacy, fallbackSvg]

  return (
    <img
      src={sources[0]}
      alt={alt}
      className={cn('pointer-events-none select-none object-contain w-auto', className)}
      draggable={false}
      data-fallback-index="1"
      onError={(e) => {
        const target = e.currentTarget
        const index = Number(target.dataset.fallbackIndex ?? '1')
        const next = sources[index]
        if (next) {
          target.dataset.fallbackIndex = String(index + 1)
          target.src = next
          return
        }
        target.src = fallbackSvg
      }}
    />
  )
}

export default HatchLogo
