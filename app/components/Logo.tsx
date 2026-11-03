export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="64" height="64" rx="14" fill="#0A7B83" />
      <path d="M9 64 C9 51 19 46.5 32 46.5 C45 46.5 55 51 55 64 Z" fill="#FFFFFF" />
      <path d="M26 47.5 L32 56 L38 47.5" fill="none" stroke="#0A7B83" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M32 56 L32 64" stroke="#E8A317" strokeWidth="3" strokeLinecap="round" />
      <rect x="28" y="40" width="8" height="8" rx="2" fill="#E3AE82" />
      <circle cx="19.6" cy="32" r="2.4" fill="#F2C9A0" />
      <circle cx="44.4" cy="32" r="2.4" fill="#F2C9A0" />
      <circle cx="32" cy="30.5" r="12.5" fill="#F2C9A0" />
      <circle cx="26.8" cy="32" r="3.9" fill="#FFFFFF" fillOpacity="0.55" stroke="#0F1B2D" strokeWidth="1.6" />
      <circle cx="37.2" cy="32" r="3.9" fill="#FFFFFF" fillOpacity="0.55" stroke="#0F1B2D" strokeWidth="1.6" />
      <path d="M30.7 31.6 Q32 30.6 33.3 31.6" fill="none" stroke="#0F1B2D" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="26.8" cy="32.3" r="1.25" fill="#0F1B2D" />
      <circle cx="37.2" cy="32.3" r="1.25" fill="#0F1B2D" />
      <path d="M27.8 37.6 Q32 41.6 36.2 37.6" fill="none" stroke="#0F1B2D" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="23.2" cy="36.6" r="1.8" fill="#EE9E86" fillOpacity="0.7" />
      <circle cx="40.8" cy="36.6" r="1.8" fill="#EE9E86" fillOpacity="0.7" />
      <path d="M20.5 21.5 L20.5 27 C20.5 30 43.5 30 43.5 27 L43.5 21.5 L32 26.2 Z" fill="#0F1B2D" />
      <polygon points="32,8 57,17.2 32,26.4 7,17.2" fill="#0F1B2D" />
      <polygon points="32,10.6 51.5,17.2 32,23.8 12.5,17.2" fill="#1B2B45" />
      <circle cx="32" cy="17.2" r="1.6" fill="#E8A317" />
      <path d="M32 17.2 L53 19.6 L53 29" fill="none" stroke="#E8A317" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M53 28 L51.4 33.2 L54.6 33.2 Z" fill="#E8A317" />
    </svg>
  )
}