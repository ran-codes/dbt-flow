import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 28,
  md: 36,
  lg: 48,
};

export default function Logo({ size = 'sm', className = '' }: LogoProps) {
  const dimension = sizes[size];

  return (
    <Image
      src="/logo.svg"
      alt="dbt-planner logo"
      width={dimension}
      height={dimension}
      className={className}
      priority
    />
  );
}
