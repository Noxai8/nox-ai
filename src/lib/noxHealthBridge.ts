export type NoxHealthPlatform = 'ios' | 'android';
export type NoxHealthSource = 'apple_health' | 'health_connect';

export type NoxHealthDataType =
  | 'steps'
  | 'distance'
  | 'active_calories'
  | 'active_minutes'
  | 'workout'
  | 'heart_rate'
  | 'sleep'
  | 'hrv'
  | 'weight'
  | 'body_fat';

export type NoxHealthPermissionState = 'not_determined' | 'granted' | 'denied' | 'unavailable';

export type NoxHealthRecord = {
  source: NoxHealthSource;
  externalId: string;
  dataType: NoxHealthDataType;
  startAt: string;
  endAt?: string | null;
  value?: number | null;
  unit?: string | null;
  device?: string | null;
  metadata?: Record<string, unknown>;
};

export type NoxHealthPermission = {
  dataType: NoxHealthDataType;
  read: NoxHealthPermissionState;
  write?: NoxHealthPermissionState;
};

export type NoxHealthSyncRequest = {
  dataTypes: NoxHealthDataType[];
  since?: string | null;
  until?: string | null;
  cursor?: string | null;
};

export type NoxHealthSyncResult = {
  source: NoxHealthSource;
  records: NoxHealthRecord[];
  cursor?: string | null;
  syncedAt: string;
};

export interface NoxHealthNativeBridge {
  platform: NoxHealthPlatform;
  source: NoxHealthSource;
  isAvailable(): Promise<boolean>;
  getPermissions(dataTypes: NoxHealthDataType[]): Promise<NoxHealthPermission[]>;
  requestPermissions(dataTypes: NoxHealthDataType[]): Promise<NoxHealthPermission[]>;
  sync(request: NoxHealthSyncRequest): Promise<NoxHealthSyncResult>;
}

declare global {
  interface Window {
    NOXHealth?: NoxHealthNativeBridge;
  }
}

export const NOX_HEALTH_DEFAULT_READ_TYPES: NoxHealthDataType[] = [
  'steps',
  'distance',
  'active_calories',
  'active_minutes',
  'workout',
  'heart_rate',
  'sleep',
  'hrv',
  'weight',
  'body_fat',
];

export function getNoxHealthBridge(): NoxHealthNativeBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = window.NOXHealth;
  if (!bridge) return null;
  if (bridge.platform === 'ios' && bridge.source !== 'apple_health') return null;
  if (bridge.platform === 'android' && bridge.source !== 'health_connect') return null;
  return bridge;
}

export async function getNoxHealthBridgeStatus() {
  const bridge = getNoxHealthBridge();
  if (!bridge) return { available: false as const, platform: null, source: null };
  try {
    const available = await bridge.isAvailable();
    return { available, platform: bridge.platform, source: bridge.source };
  } catch {
    return { available: false as const, platform: bridge.platform, source: bridge.source };
  }
}
