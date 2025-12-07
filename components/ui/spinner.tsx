/**
 * Loading-Spinner Komponente
 * Zeigt einen animierten Spinner an, während Inhalte geladen werden
 */
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} border-t-transparent rounded-full animate-spin`}
        style={{
          borderColor: "rgba(208, 137, 69, 0.3)",
          borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Vollbild Loading-Komponente
 * Zeigt einen Spinner in der Mitte des Bildschirms
 */
export function LoadingScreen({ text = "Lädt..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Spinner size="lg" />
      <p className="text-sm" style={{ color: "rgba(244, 207, 171, 0.8)" }}>
        {text}
      </p>
    </div>
  );
}






