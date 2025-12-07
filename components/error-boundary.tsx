"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary für Client-Side Fehler
 * Fängt Fehler ab und zeigt eine Fehlermeldung an
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#1A1A1A]">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4 text-[#F4CFAB]">
              Etwas ist schiefgelaufen
            </h1>
            <p className="text-sm text-[#F4CFAB]/60 mb-6">
              Die Anwendung ist auf einen Fehler gestoßen. Bitte versuchen Sie es erneut.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-[#F4CFAB]/60 cursor-pointer mb-2">
                  Fehlerdetails (nur in Entwicklung)
                </summary>
                <pre className="text-xs text-red-400 bg-black/20 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <Button
              onClick={this.handleReset}
              className="bg-[#F4CFAB] text-[#1A1A1A] hover:bg-[#F4CFAB]/90"
            >
              Seite neu laden
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

