import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-[640px] px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#FBEDEB] text-[#B3372F]">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">
            {this.props.fallbackTitle || 'Algo salió mal al cargar esta vista'}
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            {this.state.error?.message || 'Ocurrió un error inesperado al procesar la información.'}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/courses';
              }}
              className="gap-2 text-xs"
            >
              <ArrowLeft size={14} /> Volver a mis cursos
            </Button>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="gap-2 text-xs"
            >
              <RefreshCw size={14} /> Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
