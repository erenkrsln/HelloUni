"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onReset?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React rendering errors and provides a recovery UI
 * Prevents white screen crashes on mobile
 */
export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error details for debugging
        console.error("🔴 App Crash Caught by Error Boundary:", error);
        console.error("Component Stack:", errorInfo.componentStack);

        // Store error info in state for display
        this.setState({
            error,
            errorInfo,
        });

        // Log to external monitoring service if available
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    handleReset = () => {
        // Clear error state
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });

        // Clear any cached data that might be causing the error
        if (typeof window !== "undefined") {
            // Clear session storage (except auth data)
            const keysToKeep = ["auth_token", "user_id"];
            const keysToRemove: string[] = [];

            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && !keysToKeep.includes(key)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => sessionStorage.removeItem(key));
        }

        // Call parent reset handler if provided
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    handleReload = () => {
        // Full page reload as last resort
        if (typeof window !== "undefined") {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        {/* Error Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
                            Etwas ist schiefgelaufen
                        </h2>

                        {/* Description */}
                        <p className="text-center text-gray-600 mb-6">
                            Die App ist auf einen Fehler gestoßen. Keine Sorge, deine Daten sind sicher.
                        </p>

                        {/* Error Details (collapsed by default) */}
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details className="mb-6 p-3 bg-gray-100 rounded text-xs">
                                <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                                    Fehlerdetails (Entwicklermodus)
                                </summary>
                                <div className="mt-2 space-y-2">
                                    <div>
                                        <strong>Fehler:</strong>
                                        <pre className="mt-1 text-red-600 whitespace-pre-wrap break-words">
                                            {this.state.error.toString()}
                                        </pre>
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <strong>Stack:</strong>
                                            <pre className="mt-1 text-gray-600 whitespace-pre-wrap break-words overflow-x-auto">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full flex items-center justify-center gap-2 bg-[#D08945] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#B87738] transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Seite neu laden
                            </button>

                            <button
                                onClick={this.handleReload}
                                className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Komplett neu starten
                            </button>
                        </div>

                        {/* Help Text */}
                        <p className="text-center text-xs text-gray-500 mt-4">
                            Wenn das Problem weiterhin besteht, versuche den Browser-Cache zu leeren.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook to reset error boundary from functional components
 */
export function useErrorHandler() {
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        if (error) {
            throw error;
        }
    }, [error]);

    return setError;
}
