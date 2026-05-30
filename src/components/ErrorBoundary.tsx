import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error?: Error;
  resetKey?: string | number;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  // Reset error state when the resetKey (e.g. route) changes
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, error: undefined, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="glass p-8 rounded-3xl max-w-md border border-white/10">
            <h2 className="text-2xl font-black mb-3 text-primary">Nešto je pošlo po krivu</h2>
            <p className="text-muted-foreground text-sm mb-2">
              Stranica se nije učitala ispravno. Pokušaj ponovo.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-400/60 font-mono mb-6 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-primary text-black rounded-xl font-black text-sm hover:opacity-90 transition-opacity"
            >
              Pokušaj ponovo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
