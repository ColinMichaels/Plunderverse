import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class EngineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ENGINE] Render error caught by boundary:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#000",
            color: "#fff",
            fontFamily: "monospace",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem" }}>⚠</div>
          <h2 style={{ color: "#f97316", margin: 0 }}>Rendering Engine Error</h2>
          <p style={{ color: "#94a3b8", maxWidth: "480px", margin: 0 }}>
            The 3D renderer crashed. This can happen if your GPU driver is outdated or WebGL is unavailable.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: "#111",
                border: "1px solid #333",
                borderRadius: "4px",
                padding: "0.75rem",
                fontSize: "0.75rem",
                color: "#ef4444",
                maxWidth: "600px",
                overflow: "auto",
                textAlign: "left",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: "0.5rem 1.5rem",
                background: "#1e293b",
                color: "#38bdf8",
                border: "1px solid #38bdf8",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: "0.5rem 1.5rem",
                background: "#f97316",
                color: "#000",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
