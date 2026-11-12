import { ArrowLeft, Construction } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

function UnderConstructionVector() {
  return (
    <svg
      viewBox="0 0 360 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-[340px] drop-shadow-sm sm:max-w-[400px]"
      aria-hidden="true"
    >
      <defs>
        {/* Background Radial Glow */}
        <radialGradient id="construct-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </radialGradient>

        {/* Diagonal Warning Stripe Pattern */}
        <pattern id="stripe-pattern" width="16" height="16" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="8" height="16" fill="var(--color-brand)" />
          <rect x="8" width="8" height="16" fill="var(--color-surface)" />
        </pattern>
      </defs>

      {/* Ambient background glow */}
      <circle cx="180" cy="110" r="100" fill="url(#construct-glow)" />

      {/* Blueprint grid lines */}
      <g stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6">
        <line x1="30" y1="180" x2="330" y2="180" />
        <line x1="60" y1="40" x2="60" y2="180" />
        <line x1="180" y1="30" x2="180" y2="180" />
        <line x1="300" y1="40" x2="300" y2="180" />
      </g>

      {/* Ground platform line */}
      <line x1="20" y1="185" x2="340" y2="185" stroke="var(--color-border-control)" strokeWidth="2" strokeLinecap="round" />

      {/* Construction Crane Tower (Left) */}
      <g stroke="var(--color-ink-muted)" strokeWidth="1.5">
        <line x1="70" y1="185" x2="70" y2="60" />
        <line x1="90" y1="185" x2="90" y2="60" />
        {/* Lattice bracing */}
        <line x1="70" y1="180" x2="90" y2="155" />
        <line x1="70" y1="155" x2="90" y2="180" />
        <line x1="70" y1="155" x2="90" y2="130" />
        <line x1="70" y1="130" x2="90" y2="155" />
        <line x1="70" y1="130" x2="90" y2="105" />
        <line x1="70" y1="105" x2="90" y2="130" />
        <line x1="70" y1="105" x2="90" y2="80" />
        <line x1="70" y1="80" x2="90" y2="105" />
        <line x1="70" y1="80" x2="90" y2="60" />
        {/* Horizontal Jib / Boom */}
        <line x1="45" y1="60" x2="220" y2="60" strokeWidth="2" stroke="var(--color-ink)" />
        <line x1="45" y1="52" x2="90" y2="60" stroke="var(--color-brand)" strokeWidth="1.5" />
        <line x1="90" y1="45" x2="190" y2="60" stroke="var(--color-brand)" strokeWidth="1" strokeDasharray="2 2" />
        {/* Crane Tower Peak */}
        <line x1="70" y1="60" x2="80" y2="40" stroke="var(--color-ink)" strokeWidth="2" />
        <line x1="90" y1="60" x2="80" y2="40" stroke="var(--color-ink)" strokeWidth="2" />
        {/* Counterweight */}
        <rect x="42" y="60" width="16" height="14" rx="2" fill="var(--color-surface-subtle)" stroke="var(--color-border-control)" strokeWidth="1.5" />
        {/* Hoist cable & Hook */}
        <line x1="180" y1="60" x2="180" y2="105" stroke="var(--color-brand)" strokeWidth="1.5" />
        <path d="M176 105 C176 112 184 112 184 108" stroke="var(--color-brand)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* Floating Document Block (Being Lifted by Crane) */}
      <g transform="translate(150, 95)">
        <rect
          x="0"
          y="0"
          width="60"
          height="45"
          rx="6"
          fill="var(--color-surface)"
          stroke="var(--color-brand)"
          strokeWidth="2"
        />
        {/* Document lines */}
        <line x1="10" y1="12" x2="35" y2="12" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="20" x2="50" y2="20" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="27" x2="45" y2="27" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="34" x2="38" y2="34" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Small corner badge */}
        <circle cx="50" cy="12" r="4" fill="var(--color-brand-soft)" stroke="var(--color-brand)" strokeWidth="1" />
      </g>

      {/* Construction Safety Barricade (Center-Right) */}
      <g transform="translate(230, 140)">
        {/* Legs */}
        <line x1="12" y1="28" x2="6" y2="45" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round" />
        <line x1="72" y1="28" x2="78" y2="45" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="45" x2="18" y2="45" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round" />
        <line x1="68" y1="45" x2="80" y2="45" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round" />
        {/* Striped Board */}
        <rect
          x="4"
          y="10"
          width="76"
          height="18"
          rx="3"
          fill="url(#stripe-pattern)"
          stroke="var(--color-border-control)"
          strokeWidth="1.5"
        />
        {/* Warning light on top */}
        <circle cx="42" cy="5" r="4" fill="var(--color-brand)" />
        <circle cx="42" cy="5" r="6" stroke="var(--color-brand)" strokeWidth="1" opacity="0.4" />
      </g>

      {/* Traffic Cone (Front Right) */}
      <g transform="translate(300, 150)">
        <path d="M12 0 L24 30 L0 30 Z" fill="var(--color-brand)" />
        {/* White reflective stripes */}
        <polygon points="9,9 15,9 18,17 6,17" fill="var(--color-surface)" />
        <polygon points="4,22 20,22 22,27 2,27" fill="var(--color-surface)" />
        <rect x="-3" y="30" width="30" height="4" rx="1.5" fill="var(--color-brand)" />
      </g>

      {/* Floating Gear Accent (Top Right) */}
      <g transform="translate(260, 45)" stroke="var(--color-border-control)" strokeWidth="1.5" fill="var(--color-surface-subtle)">
        <circle cx="14" cy="14" r="8" />
        <path d="M14 2 L14 6 M14 22 L14 26 M2 14 L6 14 M22 14 L26 14 M5.5 5.5 L8.5 8.5 M19.5 19.5 L22.5 22.5 M5.5 22.5 L8.5 19.5 M19.5 5.5 L22.5 8.5" stroke="var(--color-brand)" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Digital sparkles / code sparks */}
      <g fill="var(--color-brand)">
        <polygon points="135,50 137,55 142,57 137,59 135,64 133,59 128,57 133,55" opacity="0.7" />
        <polygon points="230,85 231,88 234,89 231,90 230,93 229,90 226,89 229,88" opacity="0.6" />
      </g>
    </svg>
  );
}

export function GuidelinePage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] min-h-[calc(100dvh-8rem)] flex-col gap-6">
      <PageHeader
        title="Guideline VAPT"
        description="Panduan dan standar metodologi pengujian keamanan."
      />

      <Card className="flex flex-1 flex-col items-center justify-center p-8 text-center sm:p-12">
        <div className="mb-6 flex justify-center">
          <UnderConstructionVector />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1 text-caption font-medium text-brand">
          <Construction className="size-3.5" aria-hidden="true" />
          <span>Dalam Tahap Pengembangan</span>
        </div>

        <h2 className="mt-4 text-title-lg text-ink sm:text-heading-sm">
          Fitur Sedang Dibangun
        </h2>

        <p className="mt-2 max-w-md text-body text-ink-secondary">
          Modul panduan Manajemen VAPT sedang dalam tahap pengembangan.
        </p>

        <div className="mt-6 flex items-center justify-center">
          <Button asChild variant="solid" leadingIcon={<ArrowLeft />}>
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
