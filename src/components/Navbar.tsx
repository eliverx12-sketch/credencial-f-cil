import React, { useState } from 'react';
import {
  Zap,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
  Clock,
  Layers,
  Settings,
  Download,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { EventItem, LicenseInfo } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface NavbarProps {
  events: EventItem[];
  activeEvent: EventItem | null;
  onSelectEvent: (eventId: string) => void;
  isOnline: boolean;
  syncQueueCount: number;
  onTriggerSync: () => void;
  isSyncing: boolean;
  license: LicenseInfo | null;
  onOpenArchitecture: () => void;
  onOpenSettings: () => void;
  onOpenEventsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  events,
  activeEvent,
  onSelectEvent,
  isOnline,
  syncQueueCount,
  onTriggerSync,
  isSyncing,
  license,
  onOpenArchitecture,
  onOpenSettings,
  onOpenEventsModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-inner">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white leading-tight">
                Credencia Fácil
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 -mt-0.5">
              Controle Ágil de Eventos
            </p>
          </div>
        </div>

        {/* Event Selector */}
        <div className="relative">
          <button
            onClick={() => setShowEventDropdown(!showEventDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm text-slate-200 transition max-w-[160px] sm:max-w-xs truncate"
            title={activeEvent?.name || 'Selecione o evento'}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="truncate font-medium">{activeEvent?.name || 'Nenhum Evento'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </button>

          {showEventDropdown && (
            <div className="absolute left-0 mt-2 w-72 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>Eventos Cadastrados</span>
                <span className="text-indigo-600 font-semibold">{events.length}</span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {events.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      onSelectEvent(evt.id);
                      setShowEventDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex flex-col hover:bg-indigo-50 transition ${
                      activeEvent?.id === evt.id ? 'bg-indigo-50/80 font-semibold text-indigo-950' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{evt.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{evt.date || 'Sem data'} • {evt.location || 'Local a definir'}</span>
                  </button>
                ))}
              </div>
              <div className="pt-1.5 border-t border-slate-100 px-2">
                <button
                  onClick={() => {
                    setShowEventDropdown(false);
                    onOpenEventsModal();
                  }}
                  className="w-full py-1.5 px-2.5 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  + Criar ou Gerenciar Eventos
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Online / Offline & Sync Indicator */}
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60">
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Modo Offline</span>
              </span>
            )}

            {/* Offline Sync Button */}
            {syncQueueCount > 0 && (
              <button
                onClick={onTriggerSync}
                disabled={isSyncing || !isOnline}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition disabled:opacity-50"
                title="Sincronizar check-ins pendentes"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{syncQueueCount} pendente{syncQueueCount > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>

          {/* License Badge */}
          {license && (
            <div className="hidden sm:flex items-center">
              {license.status === 'unlimited' ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Vitalício
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border ${
                    license.daysRemaining <= 2
                      ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                      : 'bg-indigo-950/70 text-indigo-300 border-indigo-800'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Teste: {license.daysRemaining}d
                </span>
              )}
            </div>
          )}

          {/* PWA Install Button & Guide */}
          {!isInstalled && (
            <>
              {isInstallable ? (
                <button
                  onClick={install}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                  title="Instalar App no dispositivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Instalar App</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold transition cursor-pointer"
                  title="Como instalar no Android, PC ou iPhone"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="hidden md:inline">Instalar App</span>
                </button>
              )}

              {showIOSGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
                  <div className="w-full max-w-md rounded-2xl bg-slate-900 text-white p-6 shadow-2xl border border-slate-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-base font-bold text-white">Instalar o Credencia Fácil</h3>
                      </div>
                      <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-white">
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                        <strong className="text-white block mb-1">📱 No Android (Google Chrome ou Samsung Internet):</strong>
                        1. Toque no menu de <strong>3 pontos</strong> no canto superior direito.<br />
                        2. Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.<br />
                        3. O app funcionará em tela cheia com acesso instantâneo e offline.
                      </div>

                      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                        <strong className="text-white block mb-1">💻 No Computador (PC / Windows / Mac):</strong>
                        1. No Google Chrome ou Microsoft Edge, olhe para o canto direito da barra de endereços (onde digita o link).<br />
                        2. Clique no ícone de <strong>computador com seta para baixo (Instalar)</strong>.<br />
                        3. O app abrirá como uma janela de software nativo sem barras de navegador.
                      </div>

                      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                        <strong className="text-white block mb-1">🍎 No iPhone / iPad (Safari):</strong>
                        1. Toque no botão <strong>Compartilhar</strong> (quadrado com seta).<br />
                        2. Role e selecione <strong>"Adicionar à Tela de Início"</strong>.
                      </div>
                    </div>

                    <button
                      onClick={() => setShowIOSGuide(false)}
                      className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                    >
                      Entendi, fechar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Architecture & How it Works */}
          <button
            onClick={onOpenArchitecture}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
            title="Arquitetura, Banco de Dados & Manual"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Arquitetura & Guia</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
            title="Configurações e Licença"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
