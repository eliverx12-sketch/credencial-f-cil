import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Sparkles, Clock, CheckCircle2, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { activateTrial, activateUnlimited } from '../services/license';
import { LicenseInfo } from '../types';

interface LicenseGateProps {
  onUnlocked: (license: LicenseInfo) => void;
}

export const LicenseGate: React.FC<LicenseGateProps> = ({ onUnlocked }) => {
  const [tab, setTab] = useState<'trial' | 'unlimited'>('trial');
  const [trialPin, setTrialPin] = useState('7777');
  const [unlimitedPin, setUnlimitedPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleTrialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = activateTrial(trialPin);
    if (res.success && res.license) {
      setSuccessMsg(res.message);
      setTimeout(() => onUnlocked(res.license!), 600);
    } else {
      setError(res.message);
    }
  };

  const handleUnlimitedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = activateUnlimited(unlimitedPin);
    if (res.success && res.license) {
      setSuccessMsg(res.message);
      setTimeout(() => onUnlocked(res.license!), 600);
    } else {
      setError(res.message);
    }
  };

  const handleQuickDemo = () => {
    const res = activateTrial('7777');
    if (res.license) {
      onUnlocked(res.license);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100/10">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-8 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
            <Zap className="w-8 h-8 text-amber-300 fill-amber-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Credencia Fácil</h1>
          <p className="text-indigo-100 text-sm mt-1">
            Sistema Ágil de Credenciamento, Crachás & Check-in
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('trial');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition ${
              tab === 'trial'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            Teste Grátis (7 Dias)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('unlimited');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition ${
              tab === 'unlimited'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Licença Vitalícia
          </button>
        </div>

        {/* Content body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'trial' ? (
            <form onSubmit={handleTrialSubmit} className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900">
                <p className="font-semibold flex items-center gap-1.5 text-indigo-950 mb-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Ambiente de Degustação Completo
                </p>
                Acesso irrestrito a todas as funções por 7 dias. Digite sua senha numérica pessoal ou use a senha padrão sugerida abaixo.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Senha Numérica de Teste / Acesso:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={trialPin}
                    onChange={(e) => setTrialPin(e.target.value)}
                    placeholder="Digite senha numérica (ex: 370819 ou 7777)"
                    maxLength={10}
                    className="w-full px-4 py-3 pl-11 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono tracking-widest text-slate-800 bg-slate-50/50"
                    required
                  />
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                  <p>
                    PIN <strong className="text-indigo-600 font-mono">370819</strong>: Acesso liberado por <strong>3 dias</strong>.
                  </p>
                  <p>
                    PIN <strong className="text-slate-700 font-mono">7777</strong>: Teste de <strong>7 dias</strong>.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar com Senha Numérica</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleUnlimitedSubmit} className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-950">
                <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Liberação Permanente & Sem Limite
                </p>
                Digite o código numérico de ativação vitalícia.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Código Numérico de Liberação:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={unlimitedPin}
                    onChange={(e) => setUnlimitedPin(e.target.value)}
                    placeholder="Digite o código numérico"
                    maxLength={12}
                    className="w-full px-4 py-3 pl-11 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono tracking-widest text-slate-800 bg-slate-50/50"
                    required
                  />
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Acesso irrestrito e vitalício para gerenciamento e credenciamento de eventos.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ativar Licença Permanente</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Button */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2 transition"
            >
              Ou entre diretamente no Modo Demonstração Rápida
            </button>
          </div>
        </div>

        {/* Footer badges */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Versão PWA 2.4</span>
          <span>Compatível com PC & Android</span>
        </div>
      </div>
    </div>
  );
};
