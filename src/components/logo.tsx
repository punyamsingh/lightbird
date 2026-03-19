export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 56"
      fill="none"
      role="img"
      aria-label="LightBird"
      className={className}
    >
      <defs>
        {/* Bird gradient: bright cyan at beak → deep blue at wing tips */}
        <linearGradient id="lb-bird-g" x1="45" y1="30" x2="7" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#50E0FF"/>
          <stop offset="45%"  stopColor="#0088EE"/>
          <stop offset="100%" stopColor="#003399"/>
        </linearGradient>
        {/* Text gradient: cyan left → pale blue right */}
        <linearGradient id="lb-text-g" x1="57" y1="0" x2="280" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#40DDFF"/>
          <stop offset="100%" stopColor="#CCEEFF"/>
        </linearGradient>
        {/* Subtle glow behind the bird */}
        <filter id="lb-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Wake / speed lines — peeking behind the tail */}
      <line x1="2"  y1="27" x2="10" y2="27" stroke="#0077BB" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
      <line x1="2"  y1="30" x2="14" y2="30" stroke="#0099CC" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="2"  y1="33" x2="10" y2="33" stroke="#0077BB" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>

      {/* Geometric swift — top-down, beak at right (45,30), wings swept left */}
      <path
        d="M45,30 L24,25 L7,12 L20,28 L18,30 L20,31 L7,47 L24,34 Z"
        fill="url(#lb-bird-g)"
        filter="url(#lb-glow)"
      />
      {/* Beak highlight — the "light" in LightBird */}
      <circle cx="45" cy="30" r="2.5" fill="#AAEEFF" opacity="0.9"/>

      {/* Wordmark — Orbitron loaded by the page, so it renders correctly here */}
      <text
        x="57"
        y="39"
        fontFamily="Orbitron, monospace"
        fontWeight="900"
        fontSize="26"
        letterSpacing="3"
        fill="url(#lb-text-g)"
      >
        LIGHTBIRD
      </text>
    </svg>
  );
}
