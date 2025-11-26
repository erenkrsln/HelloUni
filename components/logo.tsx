import Image from "next/image";

export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt="HelloUni Logo"
      width={128}
      height={128}
      className={className}
      priority
    />
  );
}

