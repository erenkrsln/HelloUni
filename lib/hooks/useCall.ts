import { useContext } from "react";
import { CallContext, type CallContextValue } from "@/components/call/CallProvider";

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall muss innerhalb von <CallProvider> verwendet werden");
  return ctx;
}
