import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  KeyRound,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Calendar,
  MapPin,
  FileText,
  Download,
  Upload,
  LogOut,
  ShieldAlert,
  Camera,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  VideoOff,
} from 'lucide-react';
import { AppSettings, EventItem, LicenseInfo } from '../types';
import { storageService } from '../services/storage';
import { audioService } from '../services/audio';
import { activateUnlimited, removeLicense } from '../services/license';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent: EventItem | null;
  license: LicenseInfo | null;
  onLicenseUpdated: (newLicense: LicenseInfo | null) => void;
  onEventUpdated: () => void;
  onLockScreen: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeEvent,
  license,
  onLicenseUpdated,
  onEventUpdated,
  onLockScreen,
}) => {
  const currentSettings = storageService.getSettings();

  // Terminal Settings
  const [operatorName, setOperatorName] = useState(currentSettings.operatorName);
  const [deviceName, setDeviceName] = useState(currentSettings.deviceName);
  const [soundEnabled, setSoundEnabled] = useState(currentSettings.soundEnabled);

  // Active Event Editable Details
  const [eventName, setEventName] = useState(activeEvent?.name || '');
  const [eventLocation, setEventLocation] = useState(activeEvent?.location || '');
  const [eventDate, setEventDate] = useState(activeEvent?.date || '');
  const [badgeSubtitle, setBadgeSubtitle] = useState(activeEvent?.badgeSubtitle || '');
  const [logoUrl, setLogoUrl] = useState(activeEvent?.logoUrl || '');
  const [eventSuccessMsg, setEventSuccessMsg] = useState<string | null>(null);

  // Logo Camera & File State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when activeEvent changes or modal opens
  useEffect(() => {
    if (activeEvent) {
      setEventName(activeEvent.name || '');
      setEventLocation(activeEvent.location || '');
      setEventDate(activeEvent.date || '');
      setBadgeSubtitle(activeEvent.badgeSubtitle || '');
      setLogoUrl(activeEvent.logoUrl || '');
    }
  }, [activeEvent, isOpen]);

  // Clean up camera stream when modal closes
  useEffect(() => {
    if (!isOpen && isCameraActive) {
      stopCamera();
    }
  }, [isOpen, isCameraActive]);

  // Camera capture methods
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.error('Video play error:', e));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 400, video.videoHeight || 400);
    const sx = ((video.videoWidth || 400) - size) / 2;
    const sy = ((video.videoHeight || 400) - size) / 2;

    const targetSize = Math.min(size, 350);
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, sx, sy, size, size, 0, 0, targetSize, targetSize);
      const dataUrl = canvas.toDataURL('image/png', 0.9);
      setLogoUrl(dataUrl);

      if (activeEvent) {
        storageService.updateActiveEventDetails({
          name: eventName || activeEvent.name,
          location: eventLocation || activeEvent.location,
          date: eventDate || activeEvent.date,
          badgeSubtitle: badgeSubtitle || activeEvent.badgeSubtitle,
          logoUrl: dataUrl,
        });
        onEventUpdated();
      }
      setEventSuccessMsg('Foto da logomarca capturada e salva com sucesso!');
      setTimeout(() => setEventSuccessMsg(null), 3500);
    }
    stopCamera();
  };

  // File upload method (with auto resize)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 350;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/png', 0.9);
          setLogoUrl(dataUrl);

          if (activeEvent) {
            storageService.updateActiveEventDetails({
              name: eventName || activeEvent.name,
              location: eventLocation || activeEvent.location,
              date: eventDate || activeEvent.date,
              badgeSubtitle: badgeSubtitle || activeEvent.badgeSubtitle,
              logoUrl: dataUrl,
            });
            onEventUpdated();
          }
          setEventSuccessMsg('Logomarca carregada e salva com sucesso!');
          setTimeout(() => setEventSuccessMsg(null), 3500);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (logoFileInputRef.current) logoFileInputRef.current.value = '';
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    if (activeEvent) {
      storageService.updateActiveEventDetails({
        name: eventName || activeEvent.name,
        location: eventLocation || activeEvent.location,
        date: eventDate || activeEvent.date,
        badgeSubtitle: badgeSubtitle || activeEvent.badgeSubtitle,
        logoUrl: '',
      });
      onEventUpdated();
    }
    setEventSuccessMsg('Logomarca removida com sucesso!');
    setTimeout(() => setEventSuccessMsg(null), 3000);
  };

  // Upgrade license
  const [upgradePin, setUpgradePin] = useState('');
  const [upgradeMsg, setUpgradeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Backup restore
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Save Event Details
  const handleSaveEventDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;

    storageService.updateActiveEventDetails({
      name: eventName,
      location: eventLocation,
      date: eventDate,
      badgeSubtitle,
      logoUrl: logoUrl.trim() || undefined,
    });

    setEventSuccessMsg('Dados do evento e logomarca atualizados com sucesso!');
    setTimeout(() => setEventSuccessMsg(null), 3000);
    onEventUpdated();
  };

  // Save Terminal Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...currentSettings,
      operatorName: operatorName.trim() || 'Portaria 01',
      deviceName: deviceName.trim() || 'Terminal',
      soundEnabled,
    };
    storageService.saveSettings(updated);
    audioService.enabled = soundEnabled;
    onClose();
  };

  // Upgrade License PIN
  const handleUpgradeLicense = (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeMsg(null);
    const res = activateUnlimited(upgradePin);
    if (res.success && res.license) {
      setUpgradeMsg({ type: 'success', text: res.message });
      onLicenseUpdated(res.license);
      setUpgradePin('');
    } else {
      setUpgradeMsg({ type: 'error', text: res.message });
    }
  };

  // Reset License & Return to PIN Gate
  const handleResetLicense = () => {
    if (
      confirm(
        'Deseja redefinir a licença deste aparelho? Você será desconectado e voltará à tela inicial para digitar o PIN.'
      )
    ) {
      removeLicense();
      onLicenseUpdated(null);
      onClose();
      onLockScreen();
    }
  };

  // Lock / Logout to PIN Entry screen directly
  const handleLockTerminal = () => {
    if (confirm('Deseja bloquear o terminal e retornar à tela inicial de senha/PIN?')) {
      removeLicense();
      onLicenseUpdated(null);
      onClose();
      onLockScreen();
    }
  };

  // JSON Backup Export
  const handleDownloadBackup = () => {
    storageService.exportCompleteBackupJSON(true);
  };

  // JSON Backup Restore
  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = storageService.importBackupJSON(content);
      if (res.success) {
        setBackupMsg({ type: 'success', text: res.message });
        onEventUpdated();
        setTimeout(() => setBackupMsg(null), 4000);
      } else {
        setBackupMsg({ type: 'error', text: res.message });
      }
    };
    reader.readAsText(file);
    if (backupFileInputRef.current) backupFileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight">Configurações & Painel de Controle</h2>
              <p className="text-[11px] text-slate-400">Edição do evento, terminal, backup e licença</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* SECTION 1: EDIT ACTIVE EVENT DETAILS (Name, City, Date) */}
          {activeEvent && (
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Editar Dados do Evento Ativo
                </h3>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  ID: {activeEvent.id.slice(0, 10)}
                </span>
              </div>

              {eventSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{eventSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveEventDetails} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome do Evento *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ex: Fórum de Tecnologia e Gestão 2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cidade / Local do Evento *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Ex: São Paulo - SP / Centro de Convenções"
                        className="w-full px-3 py-2 pl-8 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Data do Evento *
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subtítulo / Rodapé dos Crachás
                  </label>
                  <input
                    type="text"
                    value={badgeSubtitle}
                    onChange={(e) => setBadgeSubtitle(e.target.value)}
                    placeholder="Ex: ACESSO GERAL • PAVILHÃO 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase text-slate-800 bg-white"
                  />
                </div>

                {/* LOGOMARCA DO EVENTO (Arquivo ou Câmera) */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Logomarca do Evento & Crachás</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Exibida no topo dos crachás impressos, PDF e Word
                    </span>
                  </div>

                  {/* Camera Error Message */}
                  {cameraError && (
                    <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {/* Live Camera View (when active) */}
                  {isCameraActive ? (
                    <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 animate-in fade-in">
                      <div className="relative aspect-video max-h-56 mx-auto rounded-xl overflow-hidden bg-black border border-slate-700 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Target Frame Guide */}
                        <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-lg pointer-events-none flex items-center justify-center">
                          <span className="text-[11px] bg-black/50 text-white px-2 py-0.5 rounded font-mono">
                            Enquadre o logo aqui
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-lg"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Capturar Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Default Logo Selector / Preview */
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-300">
                      {/* Logo Preview thumbnail */}
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Logo do Evento"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="text-center p-1 text-slate-400">
                            <ImageIcon className="w-6 h-6 mx-auto mb-0.5 text-slate-300" />
                            <span className="text-[9px] block font-medium">Sem logo</span>
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <p className="text-xs text-slate-600">
                          {logoUrl
                            ? 'Logomarca ativa cadastrada. Você pode alterá-la via arquivo ou capturar uma nova foto.'
                            : 'Adicione a imagem do logo para personalizar a identidade visual de todos os crachás.'}
                        </p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          {/* File input trigger */}
                          <button
                            type="button"
                            onClick={() => logoFileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="Escolher imagem do computador ou galeria do celular"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-600" />
                            <span>Arquivo / Galeria</span>
                          </button>

                          {/* Hidden file input */}
                          <input
                            ref={logoFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />

                          {/* Camera capture trigger */}
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            title="Abrir câmera para fotografar o logotipo"
                          >
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Tirar Foto (Câmera)</span>
                          </button>

                          {/* Remove button if logo exists */}
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Remover esta logomarca"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remover</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Dados do Evento</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 2: BACKUP AUTOMÁTICO EM JSON (SEGURANÇA ANTES DE IMPORTAÇÕES) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                Cópia de Segurança Local (Backup JSON)
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Segurança dos Dados
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Baixe uma cópia completa de todos os participantes, credenciais, configurações e registros do evento em formato JSON antes de fazer importações em massa.
            </p>

            {backupMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  backupMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {backupMsg.text}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup Completo (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Restaurar de Arquivo JSON</span>
              </button>
              <input
                ref={backupFileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreBackupFile}
                className="hidden"
              />
            </div>
          </div>

          {/* SECTION 3: IDENTIFICAÇÃO DO TERMINAL & SOM */}
          <form onSubmit={handleSaveSettings} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Terminal & Operador de Portaria
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nome do Operador
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Ex: Recepção VIP, Portaria 01"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Identificador do Dispositivo
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Ex: Tablet 01, PC Central"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Habilitar avisos sonoros de check-in (bipes e alertas em tempo real)</span>
              </label>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Ajustes do Terminal</span>
              </button>
            </div>
          </form>

          {/* SECTION 4: GESTÃO DE LICENÇA, SAÍDA E PIN */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Status da Licença & Controle de Acesso
              </h3>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {license?.status === 'unlimited' ? 'Vitalício' : `${license?.daysRemaining}d restantes`}
              </span>
            </div>

            {license && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  license.status === 'unlimited'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {license.status === 'unlimited' ? (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Licença Vitalícia & Ilimitada Ativa
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-indigo-600" />
                        Período Temporário / Teste
                      </>
                    )}
                  </span>
                  <span className="font-mono text-[11px] opacity-80">PIN: {license.pin}</span>
                </div>

                {license.status === 'trial' && (
                  <p className="text-[11px] text-indigo-800">
                    Restam <strong>{license.daysRemaining} dias</strong> de acesso neste aparelho.
                  </p>
                )}
              </div>
            )}

            {/* PIN Upgrade Form */}
            {license?.status === 'trial' && (
              <form onSubmit={handleUpgradeLicense} className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Deseja ativar a Licença Vitalícia Ilimitada?
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={upgradePin}
                    onChange={(e) => setUpgradePin(e.target.value)}
                    placeholder="Digite o código numérico vitalício"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono tracking-wider uppercase bg-slate-50"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                  >
                    Ativar
                  </button>
                </div>
                {upgradeMsg && (
                  <p
                    className={`text-[11px] font-medium ${
                      upgradeMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {upgradeMsg.text}
                  </p>
                )}
              </form>
            )}

            {/* Sair e Voltar à tela de entrada (Requested by user) */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleLockTerminal}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4 text-amber-400" />
                <span>Sair e Voltar à Tela de Entrada</span>
              </button>

              <button
                type="button"
                onClick={handleResetLicense}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Trocar ou Redefinir Senha de Acesso</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
