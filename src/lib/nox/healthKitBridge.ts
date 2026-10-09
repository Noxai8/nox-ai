/** Contract for a future signed NOX iOS wrapper.
 * Safari / installed web PWA has NO HealthKit access.
 * Native layer must call receiveNOXHealthSteps only after explicit HealthKit consent.
 */
export type NOXHealthStepsPayload = {
  date: string; // device-local YYYY-MM-DD
  count: number; // aggregate for this day, never delta
  source: 'healthkit';
};

declare global {
  interface Window {
    receiveNOXHealthSteps?: (payload: NOXHealthStepsPayload) => void;
    webkit?: { messageHandlers?: { noxHealth?: { postMessage: (value: { action: string }) => void } } };
  }
}

export function healthKitBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.webkit?.messageHandlers?.noxHealth;
}

export function requestNativeStepSync(): boolean {
  if (!healthKitBridgeAvailable()) return false;
  window.webkit!.messageHandlers!.noxHealth!.postMessage({ action: 'requestSteps' });
  return true;
}

export function validateNativeSteps(payload: unknown, today: string): NOXHealthStepsPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Partial<NOXHealthStepsPayload>;
  if (p.source !== 'healthkit' || p.date !== today || !Number.isSafeInteger(p.count) || (p.count as number) < 0 || (p.count as number) > 100000) return null;
  return p as NOXHealthStepsPayload;
}
