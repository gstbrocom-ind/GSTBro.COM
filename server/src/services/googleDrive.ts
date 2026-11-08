import { Readable } from 'node:stream';
import { google, drive_v3 } from 'googleapis';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';

import { escapeDriveQueryString } from '../lib/security.js';

const ROOT_FOLDER_NAME = 'GST-Services';
const TEAM_FOLDER = '_Team';
const CLIENTS_FOLDER = '_Clients';

const CLIENT_SUBFOLDERS = ['Registration', 'Returns', 'Cancellation', 'General', 'ITC', 'Sales', 'Purchases', 'GSTR-1', 'GSTR-3B', 'Client Docs'];

export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private rootFolderId: string | null = null;

  constructor() {
    const json = env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!json) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    const credentials = JSON.parse(json);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth });
  }

  async initialize(): Promise<string> {
    if (env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      this.rootFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
      await this.ensureWorkspaceFolders(this.rootFolderId);
      await this.saveRootId(this.rootFolderId);
      return this.rootFolderId;
    }

    const { data: setting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'drive_root_id')
      .single();

    if (setting?.value) {
      this.rootFolderId = String(setting.value);
      await this.ensureWorkspaceFolders(this.rootFolderId);
      return this.rootFolderId;
    }

    const existing = await this.findFolderByName(ROOT_FOLDER_NAME);
    if (existing) {
      this.rootFolderId = existing;
      await this.ensureWorkspaceFolders(existing);
      await this.saveRootId(existing);
      return existing;
    }

    const folder = await this.createFolder(ROOT_FOLDER_NAME);
    this.rootFolderId = folder.id!;
    await this.saveRootId(folder.id!);

    await this.ensureWorkspaceFolders(folder.id!);

    return folder.id!;
  }

  private async ensureWorkspaceFolders(rootId: string): Promise<void> {
    if (!(await this.findFolderByName(TEAM_FOLDER, rootId))) await this.createFolder(TEAM_FOLDER, rootId);
    if (!(await this.findFolderByName(CLIENTS_FOLDER, rootId))) await this.createFolder(CLIENTS_FOLDER, rootId);
  }

  private async saveRootId(id: string): Promise<void> {
    await supabase.from('site_settings').upsert({ key: 'drive_root_id', value: id });
  }

  private async getRootId(): Promise<string> {
    if (!this.rootFolderId) await this.initialize();
    return this.rootFolderId!;
  }

  private async findFolderByName(name: string, parentId?: string): Promise<string | null> {
    const escapedName = escapeDriveQueryString(name);
    let q = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      const escapedParent = escapeDriveQueryString(parentId);
      q += ` and '${escapedParent}' in parents`;
    }

    const res = await this.drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    return res.data.files?.[0]?.id ?? null;
  }

  async createFolder(name: string, parentId?: string): Promise<{ id: string; url: string }> {
    const fileMetadata: drive_v3.Schema$File = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) fileMetadata.parents = [parentId];

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink',
    });

    return {
      id: res.data.id!,
      url: res.data.webViewLink ?? `https://drive.google.com/drive/folders/${res.data.id}`,
    };
  }

  async createTeamFolder(
    teamUserId: string,
    teamName: string,
    createdBy: string
  ): Promise<{ driveFolderId: string; driveFolderUrl: string; dbId: string }> {
    const rootId = await this.getRootId();
    const teamParentId = await this.findFolderByName(TEAM_FOLDER, rootId);
    if (!teamParentId) throw new Error('Team parent folder not found');

    const folderName = `${teamName}-${teamUserId.slice(0, 8)}`;
    const folder = await this.createFolder(folderName, teamParentId);

    const { data, error } = await supabase
      .from('drive_folders')
      .insert({
        owner_type: 'TEAM',
        owner_id: teamUserId,
        drive_folder_id: folder.id,
        drive_folder_url: folder.url,
        created_by: createdBy,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { driveFolderId: folder.id, driveFolderUrl: folder.url, dbId: data.id };
  }

  async createClientFolder(
    clientUserId: string,
    businessName: string,
    createdBy: string
  ): Promise<{ driveFolderId: string; driveFolderUrl: string; dbId: string }> {
    const rootId = await this.getRootId();
    const clientsParentId = await this.findFolderByName(CLIENTS_FOLDER, rootId);
    if (!clientsParentId) throw new Error('Clients parent folder not found');

    const folderName = `${businessName}-${clientUserId.slice(0, 8)}`;
    const folder = await this.createFolder(folderName, clientsParentId);

    for (const sub of CLIENT_SUBFOLDERS) {
      await this.createFolder(sub, folder.id);
    }

    const { data, error } = await supabase
      .from('drive_folders')
      .insert({
        owner_type: 'CLIENT',
        owner_id: clientUserId,
        drive_folder_id: folder.id,
        drive_folder_url: folder.url,
        created_by: createdBy,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { driveFolderId: folder.id, driveFolderUrl: folder.url, dbId: data.id };
  }

  async linkExistingClientFolder(
    clientUserId: string,
    driveFolderId: string,
    createdBy: string
  ): Promise<{ driveFolderId: string; driveFolderUrl: string; dbId: string }> {
    const res = await this.drive.files.get({
      fileId: driveFolderId,
      fields: 'id, webViewLink, mimeType',
    });

    if (res.data.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error('Provided ID is not a folder');
    }

    const url = res.data.webViewLink ?? `https://drive.google.com/drive/folders/${driveFolderId}`;

    const { data, error } = await supabase
      .from('drive_folders')
      .insert({
        owner_type: 'CLIENT',
        owner_id: clientUserId,
        drive_folder_id: driveFolderId,
        drive_folder_url: url,
        created_by: createdBy,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { driveFolderId, driveFolderUrl: url, dbId: data.id };
  }

  async createClientShortcut(
    teamFolderDriveId: string,
    clientFolderDriveId: string,
    clientBusinessName: string,
    teamFolderDbId: string,
    clientFolderDbId: string,
    createdBy: string
  ): Promise<{ shortcutId: string; dbId: string }> {
    const res = await this.drive.files.create({
      requestBody: {
        name: clientBusinessName,
        mimeType: 'application/vnd.google-apps.shortcut',
        shortcutDetails: { targetId: clientFolderDriveId },
        parents: [teamFolderDriveId],
      },
      fields: 'id',
    });

    const shortcutId = res.data.id!;

    const { data, error } = await supabase
      .from('drive_folders')
      .insert({
        owner_type: 'TEAM',
        owner_id: teamFolderDbId,
        drive_folder_id: shortcutId,
        drive_folder_url: `https://drive.google.com/drive/folders/${clientFolderDriveId}`,
        parent_folder_id: teamFolderDbId,
        is_shortcut: true,
        target_folder_id: clientFolderDbId,
        shortcut_drive_id: shortcutId,
        created_by: createdBy,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { shortcutId, dbId: data.id };
  }

  async removeShortcut(shortcutDriveId: string): Promise<void> {
    await this.drive.files.delete({ fileId: shortcutDriveId });
  }

  async uploadFile(
    folderId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer
  ): Promise<{ fileId: string; webViewLink: string; downloadLink: string }> {
    const res = await this.drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: 'id, webViewLink, webContentLink',
    });

    return {
      fileId: res.data.id!,
      webViewLink: res.data.webViewLink ?? '',
      downloadLink: res.data.webContentLink ?? '',
    };
  }

  async getClientSubfolder(clientFolderDriveId: string, subfolderName: string): Promise<string> {
    const escapedSub = escapeDriveQueryString(subfolderName);
    const escapedParent = escapeDriveQueryString(clientFolderDriveId);
    const q = `name='${escapedSub}' and '${escapedParent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await this.drive.files.list({ q, fields: 'files(id)' });
    const id = res.data.files?.[0]?.id;
    if (!id) throw new Error(`Subfolder ${subfolderName} not found`);
    return id;
  }

  async getOrCreateClientPeriodFolder(clientFolderDriveId: string, category: string, financialYear: string, month: string): Promise<string> {
    const categoryId = await this.getClientSubfolder(clientFolderDriveId, category);
    const fyId = await this.findFolderByName(financialYear, categoryId) ?? (await this.createFolder(financialYear, categoryId)).id;
    return (await this.findFolderByName(month, fyId) ?? (await this.createFolder(month, fyId)).id);
  }

  async downloadFile(fileId: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; name: string }> {
    const meta = await this.drive.files.get({ fileId, fields: 'name, mimeType' });
    const res = await this.drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    return {
      stream: res.data as unknown as NodeJS.ReadableStream,
      mimeType: meta.data.mimeType ?? 'application/octet-stream',
      name: meta.data.name ?? 'file',
    };
  }

  async listFolders(): Promise<drive_v3.Schema$File[]> {
    const rootId = await this.getRootId();
    const res = await this.drive.files.list({
      q: `'${rootId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink)',
    });
    return res.data.files ?? [];
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.drive.files.delete({ fileId });
      return true;
    } catch (err: any) {
      try {
        await this.drive.files.update({
          fileId,
          requestBody: { trashed: true },
        });
        return true;
      } catch {
        console.warn(`Could not delete Drive file ${fileId}:`, err?.message);
        return false;
      }
    }
  }

  async deleteFolder(folderId: string): Promise<boolean> {
    try {
      await this.drive.files.delete({ fileId: folderId });
      return true;
    } catch (err: any) {
      try {
        await this.drive.files.update({
          fileId: folderId,
          requestBody: { trashed: true },
        });
        return true;
      } catch {
        console.warn(`Could not delete Drive folder ${folderId}:`, err?.message);
        return false;
      }
    }
  }
}

let driveService: GoogleDriveService | null = null;

export function getDriveService(): GoogleDriveService | null {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  if (!driveService) driveService = new GoogleDriveService();
  return driveService;
}
