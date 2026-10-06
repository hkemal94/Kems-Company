import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class HataKapsayici extends (Component as {
  new (props: Props): {
    props: Props;
    state: State;
    setState(state: Partial<State> | ((prevState: State) => Partial<State>)): void;
  };
}) {
  override state: State = { hasError: false, error: null };
  override props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Bileşen hatası yakalandı:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
    const errMsg = this.state.error?.message || '';
    if (errMsg.includes('dynamically imported module') || errMsg.includes('Failed to fetch')) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || '';
      const isChunkError = errMsg.includes('dynamically imported module') || errMsg.includes('Failed to fetch');

      return (
        <div className="py-20 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F26B6F]/10 text-[#F26B6F] flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#0E1C4F] dark:text-[#F3EFE8] mb-1">
            {this.props.fallbackTitle || 'Bu sayfa yüklenirken bir sorun oluştu'}
          </h2>
          <p className="text-xs text-[#6A5E4C] dark:text-[#A6B0C9] max-w-md mb-6 leading-relaxed">
            {isChunkError
              ? 'Uygulama güncellendiği veya bağlantı tazelendiği için sayfa modülü yüklenemedi. Yeniden dene butonuna basarak sayfayı tazeleyebilirsiniz.'
              : (errMsg || 'Bilinmeyen bir hata oluştu.')}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#F3EFE8] text-xs font-semibold hover:opacity-90 cursor-pointer shadow-xs transition-opacity"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Yeniden Dene
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '';
                this.props.onReset?.();
                window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] text-[#6A5E4C] dark:text-[#A6B0C9] text-xs font-semibold hover:bg-black/5 cursor-pointer transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              Ana Sayfa
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
