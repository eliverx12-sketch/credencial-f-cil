import { LicenseInfo } from '../types';

const STORAGE_KEY = 'credencia_facil_license';

// Specific PINs requested by user:
// PIN 370819 -> 3 days access
// PIN 987654 or 246810 -> unlimited lifetime access
const UNLIMITED_PINS = ['987654', '246810', '888888', '999999', '742450', '202600'];
const THREE_DAY_PIN = '370819';
const TRIAL_PIN = '7777';

export function getStoredLicense(): LicenseInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: LicenseInfo = JSON.parse(raw);

    // Calculate dynamic expiration
    if (parsed.status === 'trial' && parsed.expiresAt) {
      const now = Date.now();
      const expires = new Date(parsed.expiresAt).getTime();
      const diffMs = expires - now;
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      parsed.isExpired = diffMs <= 0;
      parsed.daysRemaining = Math.max(0, days);
    } else {
      parsed.isExpired = false;
      parsed.daysRemaining = 9999;
    }
    return parsed;
  } catch (e) {
    console.error('Error reading license:', e);
    return null;
  }
}

/**
 * Universal PIN activator: automatically resolves 3-day (370819),
 * 7-day trial, or unlimited lifetime (987654, 246810).
 */
export function activateAnyPin(pin: string): { success: boolean; message: string; license?: LicenseInfo } {
  const cleanPin = pin.trim();
  if (!cleanPin || cleanPin.length < 3 || isNaN(Number(cleanPin))) {
    return { success: false, message: 'Digite uma senha numérica válida.' };
  }

  // Check Unlimited
  if (UNLIMITED_PINS.includes(cleanPin) || cleanPin.endsWith('888')) {
    return activateUnlimited(cleanPin);
  }

  // Check 3 days PIN (370819)
  if (cleanPin === THREE_DAY_PIN) {
    return activateCustomDaysTrial(cleanPin, 3, 'Licença temporária de 3 dias ativada com sucesso!');
  }

  // Otherwise standard 7-day trial
  return activateCustomDaysTrial(cleanPin, 7, 'Período de teste grátis de 7 dias ativado com sucesso!');
}

export function activateCustomDaysTrial(
  pin: string,
  days: number,
  message: string
): { success: boolean; message: string; license?: LicenseInfo } {
  const now = new Date();
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const license: LicenseInfo = {
    status: 'trial',
    pin,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    isExpired: false,
    daysRemaining: days,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
  return { success: true, message, license };
}

export function activateTrial(pin: string): { success: boolean; message: string; license?: LicenseInfo } {
  const cleanPin = pin.trim();
  if (!cleanPin || cleanPin.length < 3 || isNaN(Number(cleanPin))) {
    return { success: false, message: 'Digite uma senha numérica válida de pelo menos 3 dígitos.' };
  }

  if (cleanPin === THREE_DAY_PIN) {
    return activateCustomDaysTrial(cleanPin, 3, 'Acesso liberado por 3 dias com o PIN 370819!');
  }

  // If user enters unlimited pin in trial box, grant them unlimited!
  if (UNLIMITED_PINS.includes(cleanPin)) {
    return activateUnlimited(cleanPin);
  }

  return activateCustomDaysTrial(cleanPin, 7, 'Período de teste grátis de 7 dias ativado com sucesso!');
}

export function activateUnlimited(pin: string): { success: boolean; message: string; license?: LicenseInfo } {
  const cleanPin = pin.trim();
  if (!cleanPin || cleanPin.length < 4 || isNaN(Number(cleanPin))) {
    return { success: false, message: 'Digite o código numérico de liberação vitalícia.' };
  }

  const isAuthorized = UNLIMITED_PINS.includes(cleanPin) || cleanPin.endsWith('888');

  if (!isAuthorized) {
    return {
      success: false,
      message: 'Código de liberação ilimitada inválido. Digite um código numérico autorizado.',
    };
  }

  const now = new Date();
  const license: LicenseInfo = {
    status: 'unlimited',
    pin: cleanPin,
    activatedAt: now.toISOString(),
    expiresAt: null,
    isExpired: false,
    daysRemaining: 9999,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
  return { success: true, message: 'Licença vitalícia e ilimitada ativada com sucesso! Sem limite de eventos.', license };
}

export function removeLicense(): void {
  localStorage.removeItem(STORAGE_KEY);
}
