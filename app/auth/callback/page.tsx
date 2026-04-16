"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackSplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/home");
    }, 1000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 bg-white">
        <Image
          src="/logo_background.png"
          alt="HelloUni Splash Screen"
          width={170}
          height={170}
          priority
          className="w-[170px] h-[170px] object-contain bg-white"
        />
      </div>
    </main>
  );
}
