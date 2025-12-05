"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [isProfileHovered, setIsProfileHovered] = useState(false);

  return (
    <header className="relative w-full" style={{ height: "94px" }}>
      <div
        className="absolute flex items-center justify-center overflow-hidden"
        style={{ left: "16px", top: "-20px", width: "120px", height: "130px" }}
      >
        <img
          src="/logo.svg"
          alt="Logo"
          width={120}
          height={130}
          style={{
            width: "120px",
            height: "130px",
            objectFit: "contain",
            display: "block"
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            if (target.parentElement) {
              target.parentElement.innerHTML = '<span class="text-2xl font-bold" style="color: var(--color-text-beige)">C</span>';
            }
          }}
        />
      </div>
      <h1
        className="absolute font-normal"
        style={{
          position: "absolute",
          width: "100%",
          height: "30px",
          left: "50%",
          top: "50px",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-gloock), serif",
          fontStyle: "normal",
          fontWeight: 400,
          fontSize: "20px",
          lineHeight: "24px",
          textAlign: "center",
          color: "#F4CFAB"
        }}
      >
        Startseite
      </h1>
      <Link
        href="/profile"
        className="absolute flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 touch-manipulation"
        style={{ right: "28px", top: "30px", width: "44px", height: "44px", minWidth: "44px", minHeight: "44px" }}
        onMouseEnter={() => setIsProfileHovered(true)}
        onMouseLeave={() => setIsProfileHovered(false)}
      >
        <User
          className="transition-colors"
          style={{
            width: "40px",
            height: "40px",
            color: isProfileHovered ? "var(--color-text-beige-light)" : "var(--color-text-beige)"
          }}
        />
      </Link>
    </header>
  );
}

