export { SocialLinks } from './SocialLinks';
export { Header } from './Header';
export { Footer } from './Footer';
export type { SocialLink, PublicSettings, SeoMeta } from './types';
export {
  SETTINGS_SYNC_CHANNEL,
  SETTINGS_SYNC_EVENT,
  SETTINGS_SYNC_STORAGE_KEY,
  notifySettingsUpdated,
  subscribeToSettingsUpdates,
  type SettingsSyncType,
  type SettingsSyncPayload,
} from './sync';
