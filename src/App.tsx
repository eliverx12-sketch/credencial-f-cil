import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  QrCode,
  Users,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  WifiOff,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { EventItem, Participant, CategoryGroup, LicenseInfo } from './types';
import { storageService } from './services/storage';
import { getStoredLicense } from './services/license';
import { useOnlineStatus } from './hooks/usePWAInstall';

// Components
import { LicenseGate } from './components/LicenseGate';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CheckinScanner } from './components/CheckinScanner';
import { ParticipantsList } from './components/ParticipantsList';
import { BadgeGenerator } from './components/BadgeGenerator';
import { ExcelImportExport } from './components/ExcelImportExport';
import { AddParticipantModal } from './components/AddParticipantModal';
import { EventsManager } from './components/EventsManager';
import { ArchitectureModal } from './components/ArchitectureModal';
import { SettingsModal } from './components/SettingsModal';

type MainTab = 'dashboard' | 'checkin' | 'participants' | 'badges' | 'excel';

export default function App() {
  // License & Gate
  const [license, setLicense] = useState<LicenseInfo | null>(() => getStoredLicense());

  // Active Tab
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');

  // Core Data
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Online / Offline detection
  const isOnline = useOnlineStatus();

  // Load state from local-first storage
  const refreshData = useCallback(() => {
    const loadedEvents = storageService.getEvents();
    setEvents(loadedEvents);

    const currentActive = storageService.getActiveEvent();
    setActiveEvent(currentActive);

    if (currentActive) {
      const loadedParticipants = storageService.getParticipants(currentActive.id);
      setParticipants(loadedParticipants);

      const loadedCategories = storageService.getCategories(currentActive.id);
      setCategories(loadedCategories);
    } else {
      setParticipants([]);
      setCategories([]);
    }

    const queue = storageService.getSyncQueue();
    setSyncQueueCount(queue.length);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle Event Change
  const handleSelectEvent = (id: string) => {
    storageService.setActiveEventId(id);
    refreshData();
  };

  // Sync Offline Queue
  const handleTriggerSync = () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setTimeout(() => {
      // Reconcile and clear offline sync queue
      storageService.clearSyncQueue();
      setSyncQueueCount(0);
      setIsSyncing(false);
      refreshData();
    }, 800);
  };

  // Auto sync on regaining connection
  useEffect(() => {
    if (isOnline && syncQueueCount > 0) {
      handleTriggerSync();
    }
  }, [isOnline, syncQueueCount]);

  // If no valid license, display Gate screen
  if (!license || license.isExpired) {
    return <LicenseGate onUnlocked={(unlockedLicense) => setLicense(unlockedLicense)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-16 sm:pb-0">
      {/* Top Navbar (Brand, Event, Status, PWA) */}
      <Navbar
        events={events}
        activeEvent={activeEvent}
        onSelectEvent={handleSelectEvent}
        isOnline={isOnline}
        syncQueueCount={syncQueueCount}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        license={license}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenEventsModal={() => setIsEventsModalOpen(true)}
      />

      {/* Desktop Main Navigation Tabs */}
      <div className="hidden sm:block bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <nav className="flex space-x-1 sm:space-x-2 py-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Painel Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('checkin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                activeTab === 'checkin'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Credenciamento (Scanner)</span>
            </button>

            <button
              onClick={() => setActiveTab('participants')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'participants'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Participantes ({participants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('badges')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'badges'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Crachás & Etiquetas</span>
            </button>

            <button
              onClick={() => setActiveTab('excel')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'excel'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Importar / Exportar Excel</span>
            </button>
          </nav>

          {/* Quick Add Attendee Button */}
          {activeEvent && (
            <button
              onClick={() => setIsAddParticipantOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Convidado</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {!activeEvent ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum evento ativo selecionado</h2>
            <p className="text-slate-500 text-sm mb-4">
              Crie seu primeiro evento para iniciar o credenciamento e emissão de crachás.
            </p>
            <button
              onClick={() => setIsEventsModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm"
            >
              Criar Primeiro Evento
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                event={activeEvent}
                participants={participants}
                categories={categories}
                onNavigate={(tab) => {
                  if (tab === 'events') setIsEventsModalOpen(true);
                  else setActiveTab(tab);
                }}
                onOpenAddParticipant={() => setIsAddParticipantOpen(true)}
              />
            )}

            {activeTab === 'checkin' && (
              <CheckinScanner
                event={activeEvent}
                categories={categories}
                isOnline={isOnline}
                onParticipantUpdated={refreshData}
              />
            )}

            {activeTab === 'participants' && (
              <ParticipantsList
                event={activeEvent}
                participants={participants}
                categories={categories}
                onRefresh={refreshData}
                onOpenAddModal={() => setIsAddParticipantOpen(true)}
                onNavigateToBadges={() => setActiveTab('badges')}
              />
            )}

            {activeTab === 'badges' && (
              <BadgeGenerator
                event={activeEvent}
                participants={participants}
                categories={categories}
              />
            )}

            {activeTab === 'excel' && (
              <ExcelImportExport
                event={activeEvent}
                participants={participants}
                categories={categories}
                onImportComplete={refreshData}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation (Android & Mobile Friendly) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-bold ${
            activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Painel</span>
        </button>

        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-extrabold ${
            activeTab === 'checkin'
              ? 'bg-emerald-600 text-white px-3 shadow-md'
              : 'text-emerald-700 bg-emerald-50 px-2.5'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          <span>Check-in</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-bold ${
            activeTab === 'participants' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Inscritos</span>
        </button>

        <button
          onClick={() => setActiveTab('badges')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-bold ${
            activeTab === 'badges' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Printer className="w-5 h-5 mb-0.5" />
          <span>Crachás</span>
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-bold ${
            activeTab === 'excel' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5 mb-0.5" />
          <span>Excel</span>
        </button>
      </div>

      {/* Floating Offline Notification when offline */}
      {!isOnline && (
        <div className="fixed bottom-16 sm:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xl">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Modo Offline Ativo — Leituras salvas no aparelho</span>
        </div>
      )}

      {/* Modals */}
      {activeEvent && (
        <AddParticipantModal
          event={activeEvent}
          categories={categories}
          isOpen={isAddParticipantOpen}
          onClose={() => setIsAddParticipantOpen(false)}
          onSaved={refreshData}
        />
      )}

      <EventsManager
        events={events}
        activeEvent={activeEvent}
        isOpen={isEventsModalOpen}
        onClose={() => setIsEventsModalOpen(false)}
        onSelectEvent={handleSelectEvent}
        onRefresh={refreshData}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeEvent={activeEvent}
        license={license}
        onLicenseUpdated={(newLic) => setLicense(newLic)}
        onEventUpdated={refreshData}
        onLockScreen={() => {
          setLicense(null);
        }}
      />
    </div>
  );
}
