export type NoxConnectSource =
  | 'manual'
  | 'machine_scan'
  | 'apple_health'
  | 'health_connect'
  | 'fitbit'
  | 'whoop'
  | 'garmin'
  | 'oura'
  | 'withings'
  | 'polar'
  | 'samsung_health'
  | 'nox_band';

export type NoxConnectRecord = {
  source: NoxConnectSource;
  sourceRecordId: string;
  device?: string | null;
  dataType: string;
  value?: number | null;
  unit?: string | null;
  startedAt: string;
  endedAt?: string | null;
  priority?: number;
  importedAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
};

export const NOX_SOURCE_PRIORITY: Record<NoxConnectSource, number> = {
  manual: 100,
  nox_band: 90,
  apple_health: 80,
  health_connect: 80,
  whoop: 75,
  garmin: 75,
  fitbit: 70,
  oura: 70,
  withings: 70,
  polar: 70,
  samsung_health: 70,
  machine_scan: 40,
};

const normalizedTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const connectRecordKey = (record: NoxConnectRecord) =>
  `${record.source}:${record.sourceRecordId}`;

export const isLikelyDuplicate = (a: NoxConnectRecord, b: NoxConnectRecord) => {
  if (connectRecordKey(a) === connectRecordKey(b)) return true;
  if (a.dataType !== b.dataType) return false;

  const aStart = normalizedTime(a.startedAt);
  const bStart = normalizedTime(b.startedAt);
  const aEnd = normalizedTime(a.endedAt) || aStart;
  const bEnd = normalizedTime(b.endedAt) || bStart;

  // Imported workouts/activity records from different providers can describe
  // the same real-world session. A 5-minute tolerance handles clock drift.
  const toleranceMs = 5 * 60 * 1000;
  return Math.abs(aStart - bStart) <= toleranceMs && Math.abs(aEnd - bEnd) <= toleranceMs;
};

export const choosePreferredRecord = (a: NoxConnectRecord, b: NoxConnectRecord) => {
  const aPriority = a.priority ?? NOX_SOURCE_PRIORITY[a.source] ?? 0;
  const bPriority = b.priority ?? NOX_SOURCE_PRIORITY[b.source] ?? 0;
  if (aPriority !== bPriority) return aPriority > bPriority ? a : b;

  const aUpdated = normalizedTime(a.updatedAt || a.importedAt);
  const bUpdated = normalizedTime(b.updatedAt || b.importedAt);
  return aUpdated >= bUpdated ? a : b;
};

export const deduplicateConnectRecords = (records: NoxConnectRecord[]) => {
  const kept: NoxConnectRecord[] = [];

  for (const record of records) {
    const normalized: NoxConnectRecord = {
      ...record,
      priority: record.priority ?? NOX_SOURCE_PRIORITY[record.source] ?? 0,
      importedAt: record.importedAt || new Date().toISOString(),
    };

    const duplicateIndex = kept.findIndex(existing => isLikelyDuplicate(existing, normalized));
    if (duplicateIndex === -1) {
      kept.push(normalized);
      continue;
    }

    kept[duplicateIndex] = choosePreferredRecord(kept[duplicateIndex], normalized);
  }

  return kept;
};
