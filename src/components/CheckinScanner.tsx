import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Undo2,
  Volume2,
  VolumeX,
  Keyboard,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { EventItem, Participant, CategoryGroup, CheckinLog } from '../types';
import { storageService } from '../services/storage';
import { audioService } from '../services/audio';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface CheckinScannerProps {
  event: EventItem;
  categories: CategoryGroup[];
  isOnline: boolean;
  onParticipantUpdated: () => void;
}

type ScanStatus = 'idle' | 'success' | 'warning' | 'error';

interface ScanFeedback {
  status: ScanStatus;
  title: string;
  message: string;
  participant?: Participant;
  categoryName?: string;
  categoryColor?: string;
  timestamp?: string;
  previousTime?: string;
}

export const CheckinScanner: React.FC<CheckinScannerProps> = ({
  event,
  categories,
  isOnline,
  onParticipantUpdated,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundActive, setSoundActive] = useState(audioService.enabled);
  const [feedback, setFeedback] = useState<ScanFeedback>({
    status: 'idle',
    title: 'Pronto para leitura',
    message: 'Aproxime o QR Code ou código de barras, ou use leitor USB / Bluetooth.',
  });
  const [recentLogs, setRecentLogs] = useState<CheckinLog[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Load recent checkin logs
  const loadRecentLogs = useCallback(() => {
    const logs = storageService.getCheckinLogs(event.id);
    setRecentLogs(logs.slice(0, 8));
  }, [event.id]);

  useEffect(() => {
    loadRecentLogs();
  }, [loadRecentLogs]);

  // Audio toggle
  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    audioService.enabled = next;
  };

  // Check-in execution logic
  const processCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      // Throttle double reading within 1.2s for identical code
      const now = Date.now();
      if (lastScannedCodeRef.current === code && now - lastScannedTimeRef.current < 1200) {
        return;
      }
      lastScannedCodeRef.current = code;
      lastScannedTimeRef.current = now;

      const settings = storageService.getSettings();
      const result = storageService.recordCheckin({
        eventId: event.id,
        rawCode: code,
        operatorName: settings.operatorName,
        deviceName: settings.deviceName,
        isOffline: !isOnline,
      });

      if (result.type === 'success' && result.participant) {
        audioService.playSuccess();
        const cat = categories.find((c) => c.id === result.participant!.categoryId);
        setFeedback({
          status: 'success',
          title: 'Credenciamento Realizado!',
          message: 'Entrada registrada com sucesso.',
          participant: result.participant,
          categoryName: cat?.name || result.participant.categoryName || 'Geral',
          categoryColor: cat?.color || '#3b82f6',
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        });
        loadRecentLogs();
        onParticipantUpdated();
      } else if (result.type === 'already_checked_in' && result.participant) {
        audioService.playWarning();
        const cat = categories.find((c) => c.id === result.participant!.categoryId);
        setFeedback({
          status: 'warning',
          title: 'Atenção: Já Credenciado!',
          message: 'Este crachá já realizou entrada anteriormente.',
          participant: result.participant,
          categoryName: cat?.name || result.participant.categoryName || 'Geral',
          categoryColor: cat?.color || '#f59e0b',
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          previousTime: result.previousCheckinTime
            ? new Date(result.previousCheckinTime).toLocaleTimeString('pt-BR')
            : undefined,
        });
      } else {
        audioService.playError();
        setFeedback({
          status: 'error',
          title: 'Código Inválido',
          message: result.message || 'Código não localizado na lista de convidados.',
        });
      }

      setManualCode('');
      // Keep focus on input for fast repeated manual entries if needed
      if (manualInputRef.current) {
        manualInputRef.current.focus();
      }
    },
    [event.id, categories, isOnline, onParticipantUpdated, loadRecentLogs]
  );

  // USB & Bluetooth Hardware Scanner Hook
  useBarcodeScanner({
    onScan: (scanned) => {
      processCode(scanned);
    },
    enabled: true,
  });

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          processCode(decodedText);
        },
        () => {
          // Continuous frame scan error, ignorable
        }
      );
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError('Permissão de câmera negada ou dispositivo não encontrado.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        setIsCameraActive(false);
      } catch (e) {
        console.error('Failed to stop camera:', e);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && isCameraActive) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [isCameraActive]);

  // Undo recent checkin
  const handleUndo = (participantId: string) => {
    storageService.undoCheckin(participantId);
    loadRecentLogs();
    onParticipantUpdated();
    setFeedback({
      status: 'idle',
      title: 'Check-in desfeito',
      message: 'O participante retornou ao status de pendente.',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Quick Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Terminal de Credenciamento
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              soundActive
                ? 'bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}
            title={soundActive ? 'Som ativado' : 'Som desativado'}
          >
            {soundActive ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundActive ? 'Som Ativo' : 'Mudo'}</span>
          </button>

          {/* Scanner USB indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Leitor USB/Bluetooth Conectado</span>
          </div>
        </div>
      </div>

      {/* Main Scanner Section: Camera or Manual */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column: Visual Feedback Card */}
        <div className="md:col-span-7 flex flex-col space-y-4">
          {/* Status Display Card */}
          <div
            className={`rounded-2xl p-6 sm:p-7 border transition-all duration-300 shadow-md ${
              feedback.status === 'success'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
                : feedback.status === 'warning'
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-amber-500/20'
                : feedback.status === 'error'
                ? 'bg-rose-600 text-white border-rose-700 shadow-rose-600/20'
                : 'bg-white text-slate-800 border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {feedback.status === 'success' && <CheckCircle2 className="w-8 h-8 text-white flex-shrink-0" />}
                {feedback.status === 'warning' && <AlertTriangle className="w-8 h-8 text-slate-950 flex-shrink-0" />}
                {feedback.status === 'error' && <XCircle className="w-8 h-8 text-white flex-shrink-0" />}
                {feedback.status === 'idle' && <Camera className="w-7 h-7 text-indigo-600 flex-shrink-0" />}
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    {feedback.title}
                  </h2>
                  <p
                    className={`text-xs sm:text-sm font-medium mt-0.5 ${
                      feedback.status === 'idle' ? 'text-slate-500' : 'opacity-90'
                    }`}
                  >
                    {feedback.message}
                  </p>
                </div>
              </div>

              {feedback.timestamp && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-black/15">
                  {feedback.timestamp}
                </span>
              )}
            </div>

            {/* Attendee Details when scanned */}
            {feedback.participant && (
              <div className="mt-5 pt-4 border-t border-black/10 space-y-2">
                <div className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  {feedback.participant.name}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Category Pill */}
                  <span
                    className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm"
                    style={{
                      backgroundColor: feedback.status === 'idle' ? feedback.categoryColor : '#ffffff',
                      color: feedback.status === 'idle' ? '#ffffff' : '#0f172a',
                    }}
                  >
                    {feedback.categoryName}
                  </span>

                  {/* Public ID */}
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-black/15">
                    {feedback.participant.publicCode}
                  </span>
                </div>

                {(feedback.participant.company || feedback.participant.city) && (
                  <p className="text-xs sm:text-sm font-medium opacity-90 pt-1">
                    {feedback.participant.company}
                    {feedback.participant.company && feedback.participant.city ? ' • ' : ''}
                    {feedback.participant.city}
                  </p>
                )}

                {feedback.previousTime && (
                  <div className="mt-2 text-xs font-bold bg-black/20 p-2 rounded-lg flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Primeira entrada registrada às: {feedback.previousTime}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Entry Form */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Entrada Manual ou Leitor de Código
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processCode(manualCode);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Digite o código (ex: EVT-000001 ou nome)"
                  className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-base uppercase font-semibold text-slate-800"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition cursor-pointer flex-shrink-0"
              >
                Credenciar
              </button>
            </form>
            <p className="text-[11px] text-slate-400 mt-2">
              Qualquer leitor USB ou Bluetooth apontado para esta tela funciona imediatamente.
            </p>
          </div>
        </div>

        {/* Right Column: Camera Viewport & Controls */}
        <div className="md:col-span-5 flex flex-col space-y-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Leitor por Câmera
              </span>
              <button
                onClick={isCameraActive ? stopCamera : startCamera}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  isCameraActive
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" />
                    Desligar Câmera
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    Ativar Câmera
                  </>
                )}
              </button>
            </div>

            {/* Video Viewport Container */}
            <div className="w-full relative bg-slate-900 rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center">
              <div id={scannerContainerId} className="w-full h-full" />

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900/95">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3 text-slate-300">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">Câmera desativada</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                    Toque em "Ativar Câmera" para ler pelo smartphone ou webcam do PC.
                  </p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                  >
                    Ativar Agora
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-rose-400 text-xs">
                  <AlertTriangle className="w-8 h-8 mb-2" />
                  <p>{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Tips Box */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
              Operação de Alto Desempenho:
            </p>
            <p className="text-[11px] leading-relaxed">
              • O QR Code gerado contém <strong>apenas o ID único</strong> (ex: EVT-000001), garantindo conformidade total e leitura instantânea.
            </p>
            <p className="text-[11px] leading-relaxed">
              • Em caso de fila, você pode manter vários celulares abertos na mesma tela mesmo sem internet no local.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Check-ins History */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Últimos Credenciados Neste Terminal
          </h2>
          <span className="text-xs text-slate-400">{recentLogs.length} recentes</span>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            Nenhum credenciamento efetuado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Horário</th>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3 font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-600">
                      {log.publicCode}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {log.participantName}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {log.categoryName}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleUndo(log.participantId)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600 transition"
                        title="Desfazer check-in"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Desfazer</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
