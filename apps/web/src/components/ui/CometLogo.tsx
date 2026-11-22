import Image from "next/image";

interface CometLogoProps {
  size?: number;
  className?: string;
}

export function CometLogo({ size = 36, className = "" }: CometLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Comet"
      width={size}
      height={size}
      priority
      className={className}
    />
  );
}
