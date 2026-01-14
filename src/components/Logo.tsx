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
      {/* Hexagon frame */}
      <polygon
        points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5"
        fill="none"
        stroke="#1e293b"
        strokeWidth="3"
      />

      {/* Orange angle bracket (dbt homage) */}
      <path
        d="M57 25L22 50L57 75"
        stroke="#FF694A"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Planning node */}
      <circle cx="70" cy="50" r="9" fill="#1e293b" />
    </svg>
  );
}
