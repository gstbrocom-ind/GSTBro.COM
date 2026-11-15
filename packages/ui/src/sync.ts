export const SETTINGS_SYNC_CHANNEL = 'gstbro_settings_sync';
export const SETTINGS_SYNC_EVENT = 'gstbro:settings-updated';
export const SETTINGS_SYNC_STORAGE_KEY = 'gstbro_settings_last_updated';

export type SettingsSyncType = 'SETTINGS_UPDATED' | 'CONTENT_UPDATED' | 'SEO_UPDATED';

export interface SettingsSyncPayload {
  type: SettingsSyncType;
  timestamp: number;
}

export function notifySettingsUpdated(type: SettingsSyncType = 'SETTINGS_UPDATED') {
  if (typeof window === 'undefined') return;
  const timestamp = Date.now();
  const payload: SettingsSyncPayload = { type, timestamp };

  // 1. Same-window custom event (immediate React state update across all providers in current window)
  try {
    window.dispatchEvent(new CustomEvent(SETTINGS_SYNC_EVENT, { detail: payload }));
  } catch {
    // ignore
  }

  // 2. BroadcastChannel (cross-tab / multi-window instant update)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SETTINGS_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // ignore
  }

  // 3. LocalStorage storage event (cross-tab fallback if BroadcastChannel is unsupported or blocked)
  try {
    localStorage.setItem(SETTINGS_SYNC_STORAGE_KEY, `${type}_${timestamp}`);
  } catch {
    // ignore
  }
}

export function subscribeToSettingsUpdates(callback: (payload?: SettingsSyncPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Handler for custom DOM event (same window)
  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    callback(detail);
  };
  window.addEventListener(SETTINGS_SYNC_EVENT, handleCustomEvent);

  // Handler for BroadcastChannel (other tabs)
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(SETTINGS_SYNC_CHANNEL);
      channel.onmessage = (event) => {
        callback(event.data);
      };
    } catch {
      channel = null;
    }
  }

  // Handler for storage event (cross-tab fallback)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SETTINGS_SYNC_STORAGE_KEY && event.newValue) {
      const parts = event.newValue.split('_');
      callback({
        type: (parts[0] as SettingsSyncType) || 'SETTINGS_UPDATED',
        timestamp: parseInt(parts[1] || '0', 10) || Date.now(),
      });
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(SETTINGS_SYNC_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (channel) {
      try {
        channel.close();
      } catch {
        // ignore
      }
    }
  };
}
