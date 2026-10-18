import { EventItem, CategoryGroup, Participant, CheckinLog, SyncQueueItem, AppSettings } from '../types';

const STORAGE_KEYS = {
  EVENTS: 'cf_events',
  ACTIVE_EVENT_ID: 'cf_active_event_id',
  CATEGORIES: 'cf_categories',
  PARTICIPANTS: 'cf_participants',
  CHECKIN_LOGS: 'cf_checkin_logs',
  SYNC_QUEUE: 'cf_sync_queue',
  SETTINGS: 'cf_settings',
};

// Default Categories for new events
export const DEFAULT_CATEGORIES: Omit<CategoryGroup, 'id' | 'eventId'>[] = [
  { name: 'Palestrante', color: '#8b5cf6', badgeLabel: 'PALESTRANTE' }, // Purple
  { name: 'VIP', color: '#f59e0b', badgeLabel: 'VIP' }, // Amber / Gold
  { name: 'Organização', color: '#3b82f6', badgeLabel: 'ORGANIZAÇÃO' }, // Blue
  { name: 'Produtor', color: '#06b6d4', badgeLabel: 'PRODUÇÃO' }, // Cyan
  { name: 'Equipe', color: '#10b981', badgeLabel: 'STAFF / EQUIPE' }, // Emerald
  { name: 'Imprensa', color: '#f97316', badgeLabel: 'IMPRENSA' }, // Orange
  { name: 'Convidado', color: '#64748b', badgeLabel: 'CONVIDADO' }, // Slate
];

const DEFAULT_SETTINGS: AppSettings = {
  operatorName: 'Portaria Principal',
  deviceName: 'Terminal 01',
  defaultBadgeLayout: 'a4-6',
  printShowCompany: true,
  printShowCity: true,
  printShowBarcode: true,
  soundEnabled: true,
};

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Failed to read from storage for key ${key}:`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save to storage for key ${key}:`, e);
    }
  }

  // --- SETTINGS ---
  public getSettings(): AppSettings {
    return this.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public saveSettings(settings: AppSettings): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // --- EVENTS ---
  public getEvents(): EventItem[] {
    const events = this.get<EventItem[]>(STORAGE_KEYS.EVENTS, []);
    if (events.length === 0) {
      return this.seedInitialEvent();
    }
    return events;
  }

  public getActiveEvent(): EventItem | null {
    const events = this.getEvents();
    if (events.length === 0) return null;
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
    const found = events.find((e) => e.id === activeId);
    return found || events[0] || null;
  }

  public setActiveEventId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, id);
  }

  public saveEvent(event: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): EventItem {
    const events = this.getEvents();
    const now = new Date().toISOString();

    if (event.id) {
      // Update
      const index = events.findIndex((e) => e.id === event.id);
      if (index >= 0) {
        const updated: EventItem = {
          ...events[index],
          ...event,
          id: event.id,
          updatedAt: now,
        };
        events[index] = updated;
        this.set(STORAGE_KEYS.EVENTS, events);
        return updated;
      }
    }

    // Create new
    const newId = 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const newEvent: EventItem = {
      ...event,
      id: newId,
      orgId: 'org_master',
      createdAt: now,
      updatedAt: now,
    };
    events.unshift(newEvent);
    this.set(STORAGE_KEYS.EVENTS, events);
    this.setActiveEventId(newId);

    // Seed default categories for this event
    const categories = this.getCategories(newId);
    if (categories.length === 0) {
      this.initDefaultCategoriesForEvent(newId);
    }

    return newEvent;
  }

  public deleteEvent(id: string): void {
    const events = this.getEvents().filter((e) => e.id !== id);
    this.set(STORAGE_KEYS.EVENTS, events);
    // Also cleanup participants of this event
    const participants = this.getAllParticipants().filter((p) => p.eventId !== id);
    this.set(STORAGE_KEYS.PARTICIPANTS, participants);
    // Cleanup categories
    const categories = this.getAllCategories().filter((c) => c.eventId !== id);
    this.set(STORAGE_KEYS.CATEGORIES, categories);
    // Active event check
    if (localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID) === id) {
      if (events.length > 0) {
        this.setActiveEventId(events[0].id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
      }
    }
  }

  // --- CATEGORIES ---
  public getAllCategories(): CategoryGroup[] {
    return this.get<CategoryGroup[]>(STORAGE_KEYS.CATEGORIES, []);
  }

  public getCategories(eventId: string): CategoryGroup[] {
    const all = this.getAllCategories();
    return all.filter((c) => c.eventId === eventId);
  }

  public initDefaultCategoriesForEvent(eventId: string): CategoryGroup[] {
    const all = this.getAllCategories();
    const newCategories: CategoryGroup[] = DEFAULT_CATEGORIES.map((def) => ({
      ...def,
      id: 'cat_' + Math.random().toString(36).substring(2, 8),
      eventId,
    }));
    this.set(STORAGE_KEYS.CATEGORIES, [...all, ...newCategories]);
    return newCategories;
  }

  public saveCategory(category: Omit<CategoryGroup, 'id'> & { id?: string }): CategoryGroup {
    const all = this.getAllCategories();
    if (category.id) {
      const idx = all.findIndex((c) => c.id === category.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...category, id: category.id };
        this.set(STORAGE_KEYS.CATEGORIES, all);
        return all[idx];
      }
    }
    const created: CategoryGroup = {
      ...category,
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
    };
    all.push(created);
    this.set(STORAGE_KEYS.CATEGORIES, all);
    return created;
  }

  // --- PARTICIPANTS ---
  public getAllParticipants(): Participant[] {
    return this.get<Participant[]>(STORAGE_KEYS.PARTICIPANTS, []);
  }

  public getParticipants(eventId: string): Participant[] {
    return this.getAllParticipants().filter((p) => p.eventId === eventId);
  }

  public generateNextPublicCode(eventId: string): string {
    const participants = this.getParticipants(eventId);
    let maxNum = 0;
    participants.forEach((p) => {
      // Look for format EVT-000123 or similar
      const match = p.publicCode.match(/(\d+)/g);
      if (match && match.length > 0) {
        const lastNum = parseInt(match[match.length - 1], 10);
        if (!isNaN(lastNum) && lastNum > maxNum) {
          maxNum = lastNum;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `EVT-${String(nextNum).padStart(6, '0')}`;
  }

  public saveParticipant(participant: Omit<Participant, 'id' | 'publicCode' | 'createdAt' | 'updatedAt' | 'status'> & {
    id?: string;
    publicCode?: string;
    status?: 'pending' | 'checked_in';
    checkedInAt?: string | null;
  }): Participant {
    const all = this.getAllParticipants();
    const now = new Date().toISOString();

    if (participant.id) {
      const idx = all.findIndex((p) => p.id === participant.id);
      if (idx >= 0) {
        const existing = all[idx];
        const updated: Participant = {
          ...existing,
          ...participant,
          id: participant.id,
          publicCode: participant.publicCode || existing.publicCode,
          status: participant.status || existing.status,
          updatedAt: now,
        };
        all[idx] = updated;
        this.set(STORAGE_KEYS.PARTICIPANTS, all);
        return updated;
      }
    }

    const publicCode = participant.publicCode?.trim() || this.generateNextPublicCode(participant.eventId);
    const created: Participant = {
      ...participant,
      id: 'prt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      publicCode,
      status: participant.status || 'pending',
      createdAt: now,
      updatedAt: now,
    };
    all.unshift(created);
    this.set(STORAGE_KEYS.PARTICIPANTS, all);
    return created;
  }

  public bulkSaveParticipants(newParticipants: Participant[]): void {
    const all = this.getAllParticipants();
    // Index existing by ID or publicCode
    const existingMap = new Map<string, number>();
    all.forEach((p, idx) => {
      existingMap.set(p.id, idx);
      if (p.publicCode) existingMap.set(p.publicCode, idx);
    });

    newParticipants.forEach((np) => {
      if (existingMap.has(np.id)) {
        const idx = existingMap.get(np.id)!;
        all[idx] = { ...all[idx], ...np, updatedAt: new Date().toISOString() };
      } else if (existingMap.has(np.publicCode)) {
        const idx = existingMap.get(np.publicCode)!;
        all[idx] = { ...all[idx], ...np, updatedAt: new Date().toISOString() };
      } else {
        all.push(np);
      }
    });

    this.set(STORAGE_KEYS.PARTICIPANTS, all);
  }

  public deleteParticipant(idOrCode: string): void {
    const target = (idOrCode || '').trim();
    const all = this.getAllParticipants().filter(
      (p) => p.id !== target && p.publicCode !== target
    );
    this.set(STORAGE_KEYS.PARTICIPANTS, all);
  }

  public deleteMultipleParticipants(idsOrCodes: string[]): void {
    const set = new Set(idsOrCodes.map((s) => s.trim()));
    const all = this.getAllParticipants().filter(
      (p) => !set.has(p.id) && !set.has(p.publicCode)
    );
    this.set(STORAGE_KEYS.PARTICIPANTS, all);
  }

  // --- CHECK-IN LOGIC & REQUISITES ---
  public getParticipantByCode(eventId: string, rawCode: string): Participant | null {
    const cleanCode = rawCode.trim().toUpperCase();
    const participants = this.getParticipants(eventId);

    // Clean prefix if e.g. "CF:EVT-000001"
    const normalizedCode = cleanCode.replace(/^CF:/, '').trim();

    return (
      participants.find(
        (p) =>
          p.publicCode.toUpperCase() === normalizedCode ||
          p.publicCode.toUpperCase() === cleanCode ||
          p.id === cleanCode
      ) || null
    );
  }

  public recordCheckin(params: {
    eventId: string;
    rawCode: string;
    operatorName: string;
    deviceName: string;
    isOffline: boolean;
  }): {
    success: boolean;
    type: 'success' | 'already_checked_in' | 'not_found';
    message: string;
    participant?: Participant;
    previousCheckinTime?: string;
  } {
    const participant = this.getParticipantByCode(params.eventId, params.rawCode);

    if (!participant) {
      return {
        success: false,
        type: 'not_found',
        message: 'Código de credencial não encontrado ou não pertence a este evento!',
      };
    }

    if (participant.status === 'checked_in') {
      return {
        success: false,
        type: 'already_checked_in',
        message: 'Atenção: Participante já credenciado anteriormente!',
        participant,
        previousCheckinTime: participant.checkedInAt || undefined,
      };
    }

    // First Check-in: Register
    const now = new Date().toISOString();
    participant.status = 'checked_in';
    participant.checkedInAt = now;
    participant.checkinOperator = params.operatorName;
    participant.checkinDevice = params.deviceName;
    participant.updatedAt = now;

    // Update in participant list
    const allParticipants = this.getAllParticipants();
    const idx = allParticipants.findIndex((p) => p.id === participant.id);
    if (idx >= 0) {
      allParticipants[idx] = participant;
      this.set(STORAGE_KEYS.PARTICIPANTS, allParticipants);
    }

    // Add to log
    const categories = this.getCategories(params.eventId);
    const cat = categories.find((c) => c.id === participant.categoryId);
    const logItem: CheckinLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      eventId: params.eventId,
      participantId: participant.id,
      publicCode: participant.publicCode,
      participantName: participant.name,
      categoryName: cat?.name || participant.categoryName || 'Geral',
      timestamp: now,
      deviceInfo: params.deviceName,
      operatorName: params.operatorName,
      isOfflineSync: params.isOffline,
      syncedAt: params.isOffline ? null : now,
    };

    const logs = this.getCheckinLogs(params.eventId);
    logs.unshift(logItem);
    this.set(STORAGE_KEYS.CHECKIN_LOGS, logs);

    // If offline, add to syncQueue
    if (params.isOffline) {
      const syncQueue = this.getSyncQueue();
      syncQueue.push({
        id: logItem.id,
        participantId: participant.id,
        publicCode: participant.publicCode,
        eventId: params.eventId,
        timestamp: now,
        deviceInfo: params.deviceName,
        operatorName: params.operatorName,
      });
      this.set(STORAGE_KEYS.SYNC_QUEUE, syncQueue);
    }

    return {
      success: true,
      type: 'success',
      message: 'Check-in realizado com sucesso!',
      participant,
    };
  }

  public undoCheckin(participantId: string): void {
    const all = this.getAllParticipants();
    const idx = all.findIndex((p) => p.id === participantId);
    if (idx >= 0) {
      all[idx].status = 'pending';
      all[idx].checkedInAt = null;
      all[idx].checkinDevice = null;
      all[idx].checkinOperator = null;
      this.set(STORAGE_KEYS.PARTICIPANTS, all);
    }
  }

  // --- LOGS ---
  public getCheckinLogs(eventId: string): CheckinLog[] {
    const all = this.get<CheckinLog[]>(STORAGE_KEYS.CHECKIN_LOGS, []);
    return all.filter((l) => l.eventId === eventId);
  }

  // --- SYNC QUEUE ---
  public getSyncQueue(): SyncQueueItem[] {
    return this.get<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  public clearSyncQueue(itemIds?: string[]): void {
    if (!itemIds) {
      this.set(STORAGE_KEYS.SYNC_QUEUE, []);
      return;
    }
    const current = this.getSyncQueue();
    const filtered = current.filter((item) => !itemIds.includes(item.id));
    this.set(STORAGE_KEYS.SYNC_QUEUE, filtered);
  }

  // --- SEED INITIAL DEMO DATA ---
  private seedInitialEvent(): EventItem[] {
    const now = new Date();
    const eventId = 'evt_demo_2026';
    const initialEvent: EventItem = {
      id: eventId,
      orgId: 'org_master',
      name: 'Congresso Brasileiro de Gestão & Inovação 2026',
      date: '2026-10-25',
      location: 'Centro de Convenções Rebouças - São Paulo, SP',
      description: 'Credenciamento rápido, controle de acesso e crachás para palestras magnas e workshops.',
      status: 'active',
      badgeSubtitle: 'ACESSO GERAL & WORKSHOPS',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Save event
    this.set(STORAGE_KEYS.EVENTS, [initialEvent]);
    this.setActiveEventId(eventId);

    // Create Categories
    const categories: CategoryGroup[] = DEFAULT_CATEGORIES.map((def, i) => ({
      ...def,
      id: `cat_demo_${i}`,
      eventId,
    }));
    this.set(STORAGE_KEYS.CATEGORIES, categories);

    // Create Demo Participants
    const catPalestrante = categories.find((c) => c.name === 'Palestrante')!.id;
    const catVIP = categories.find((c) => c.name === 'VIP')!.id;
    const catOrg = categories.find((c) => c.name === 'Organização')!.id;
    const catConv = categories.find((c) => c.name === 'Convidado')!.id;
    const catEquipe = categories.find((c) => c.name === 'Equipe')!.id;

    const demoParticipants: Participant[] = [
      {
        id: 'prt_demo_1',
        eventId,
        publicCode: 'EVT-000001',
        name: 'Dra. Camila Vasconcelos',
        document: '345.892.110-44',
        phone: '(11) 98765-4321',
        email: 'camila.vasconcelos@techcorp.com.br',
        categoryId: catPalestrante,
        categoryName: 'Palestrante',
        company: 'Instituto de Inovação Digital',
        city: 'São Paulo - SP',
        status: 'checked_in',
        checkedInAt: new Date(Date.now() - 3600000).toISOString(),
        checkinOperator: 'Portaria Principal',
        checkinDevice: 'Terminal 01',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prt_demo_2',
        eventId,
        publicCode: 'EVT-000002',
        name: 'Roberto Silveira Santos',
        document: '210.741.982-12',
        phone: '(21) 99123-8877',
        email: 'roberto.santos@investcapital.com',
        categoryId: catVIP,
        categoryName: 'VIP',
        company: 'Invest Capital Global',
        city: 'Rio de Janeiro - RJ',
        status: 'pending',
        checkedInAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prt_demo_3',
        eventId,
        publicCode: 'EVT-000003',
        name: 'Ana Beatriz Mendes',
        document: '412.553.809-51',
        phone: '(31) 99882-2314',
        email: 'anabeatriz@startuphub.com',
        categoryId: catOrg,
        categoryName: 'Organização',
        company: 'Startup Hub Brasil',
        city: 'Belo Horizonte - MG',
        status: 'checked_in',
        checkedInAt: new Date(Date.now() - 1800000).toISOString(),
        checkinOperator: 'Portaria VIP',
        checkinDevice: 'Tablet Portaria',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prt_demo_4',
        eventId,
        publicCode: 'EVT-000004',
        name: 'Lucas Mendonça Ferreira',
        document: '198.442.310-90',
        phone: '(41) 97711-4455',
        email: 'lucas.ferreira@agenciavanguarda.com',
        categoryId: catConv,
        categoryName: 'Convidado',
        company: 'Agência Vanguarda',
        city: 'Curitiba - PR',
        status: 'pending',
        checkedInAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prt_demo_5',
        eventId,
        publicCode: 'EVT-000005',
        name: 'Mariana Duarte Souza',
        document: '511.902.341-20',
        phone: '(51) 98112-9900',
        email: 'mariana.duarte@producao.art',
        categoryId: catEquipe,
        categoryName: 'Equipe',
        company: 'Eventos & Produção Pro',
        city: 'Porto Alegre - RS',
        status: 'pending',
        checkedInAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prt_demo_6',
        eventId,
        publicCode: 'EVT-000006',
        name: 'Prof. Gabriel Alcantara',
        document: '321.654.987-00',
        phone: '(61) 99234-5678',
        email: 'gabriel.alcantara@unb.br',
        categoryId: catPalestrante,
        categoryName: 'Palestrante',
        company: 'Universidade de Brasília',
        city: 'Brasília - DF',
        status: 'pending',
        checkedInAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    this.set(STORAGE_KEYS.PARTICIPANTS, demoParticipants);

    return [initialEvent];
  }

  // --- EVENT DETAILS UPDATE HELPER ---
  public updateActiveEventDetails(params: {
    name: string;
    location: string;
    date: string;
    badgeSubtitle?: string;
    logoUrl?: string;
  }): EventItem | null {
    const active = this.getActiveEvent();
    if (!active) return null;

    return this.saveEvent({
      ...active,
      name: params.name.trim(),
      location: params.location.trim(),
      date: params.date.trim(),
      badgeSubtitle: params.badgeSubtitle !== undefined ? params.badgeSubtitle.trim() : active.badgeSubtitle,
      logoUrl: params.logoUrl !== undefined ? params.logoUrl : active.logoUrl,
    });
  }

  // --- AUTOMATIC BACKUP & RESTORE (JSON) ---
  public exportCompleteBackupJSON(triggerDownload = true): { data: object; filename: string } {
    const backupData = {
      version: '2.4',
      system: 'Credencia Fácil',
      exportedAt: new Date().toISOString(),
      activeEventId: localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID),
      events: this.getEvents(),
      categories: this.getAllCategories(),
      participants: this.getAllParticipants(),
      checkinLogs: this.get<CheckinLog[]>(STORAGE_KEYS.CHECKIN_LOGS, []),
      syncQueue: this.getSyncQueue(),
      settings: this.getSettings(),
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const activeEvt = this.getActiveEvent();
    const eventSlug = (activeEvt?.name || 'Geral').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const filename = `Backup_CredenciaFacil_${eventSlug}_${dateStr}.json`;

    if (triggerDownload && typeof window !== 'undefined') {
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return { data: backupData, filename };
  }

  public importBackupJSON(jsonStr: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Arquivo JSON inválido ou vazio.' };
      }

      if (parsed.events && Array.isArray(parsed.events)) {
        this.set(STORAGE_KEYS.EVENTS, parsed.events);
      }
      if (parsed.activeEventId) {
        this.setActiveEventId(parsed.activeEventId);
      }
      if (parsed.categories && Array.isArray(parsed.categories)) {
        this.set(STORAGE_KEYS.CATEGORIES, parsed.categories);
      }
      if (parsed.participants && Array.isArray(parsed.participants)) {
        this.set(STORAGE_KEYS.PARTICIPANTS, parsed.participants);
      }
      if (parsed.checkinLogs && Array.isArray(parsed.checkinLogs)) {
        this.set(STORAGE_KEYS.CHECKIN_LOGS, parsed.checkinLogs);
      }
      if (parsed.syncQueue && Array.isArray(parsed.syncQueue)) {
        this.set(STORAGE_KEYS.SYNC_QUEUE, parsed.syncQueue);
      }
      if (parsed.settings) {
        this.saveSettings(parsed.settings);
      }

      const pCount = (parsed.participants && parsed.participants.length) || 0;
      const eCount = (parsed.events && parsed.events.length) || 0;
      return {
        success: true,
        message: `Backup restaurado com sucesso! (${eCount} eventos, ${pCount} participantes carregados)`,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, message: `Falha ao importar backup: ${msg}` };
    }
  }
}

export const storageService = new StorageService();
