interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
};

export default function Logo({ size = 'sm', className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizes[size]} ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hex outline */}
      <path
        d="M50 5 L92 27 L92 73 L50 95 L8 73 L8 27 Z"
        stroke="#1e293b"
        strokeWidth="2.5"
        fill="none"
      />

      {/* Top layer (mart - dark, narrowest) */}
      <rect x="35" y="25" width="30" height="11" rx="2.5" fill="#1e293b" />

      {/* Middle layer (staging - gray) */}
      <rect x="26" y="41.5" width="48" height="11" rx="2.5" fill="#64748b" />

      {/* Bottom layer (source - orange, widest) */}
      <rect x="17" y="58" width="66" height="11" rx="2.5" fill="#FF694A" />
    </svg>
  );
}
