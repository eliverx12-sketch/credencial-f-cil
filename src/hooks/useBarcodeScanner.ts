import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (code: string) => void;
  minLength?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Hook to capture USB and Bluetooth barcode / QR scanners acting as keyboard wedges.
 * Scanners transmit keystrokes at very high speed (< 40ms per key) followed by Enter.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 4,
  maxIntervalMs = 60,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // If user is focused on a text input or textarea, let normal input handle it
      // UNLESS the keystrokes arrive abnormally fast (< 35ms), which indicates a hardware scanner
      const target = event.target as HTMLElement | null;
      const isInput =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Reset buffer if delay was too long and it wasn't an Enter key
      if (interval > maxIntervalMs && bufferRef.current.length > 0 && event.key !== 'Enter') {
        bufferRef.current = '';
      }

      if (event.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          const scanned = bufferRef.current.trim();
          bufferRef.current = '';
          if (isInput) {
            // Prevent form submit if hardware scanner was aimed at an input
            event.preventDefault();
          }
          onScan(scanned);
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Ignore non-character control keys
      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onScan, minLength, maxIntervalMs]);
}
