"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { ToastProvider } from "@/lib/toast-context";
import { AppInitializationProvider } from "@/lib/app-initialization-context";
import { ServiceWorkerRegister } from "./sw-register";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppInitializationProvider>
      <ToastProvider>
        <ReactQueryProvider>
          <SessionProvider>
            <ConvexProvider client={convex}>
              <ServiceWorkerRegister />
              {children}
            </ConvexProvider>
          </SessionProvider>
        </ReactQueryProvider>
      </ToastProvider>
    </AppInitializationProvider>
  );
}







