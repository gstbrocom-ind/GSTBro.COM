import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Readable } from 'node:stream';
import { supabase } from '../lib/supabase.js';
import { getDriveService } from '../services/googleDrive.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hashPassword, validatePassword } from '../services/passwordService.js';
import { logActivity } from '../services/activityLogger.js';
import {
  uuidParamSchema,
  validateUploadFile,
  sanitizeHeaderFileName,
  sanitizeText,
} from '../lib/security.js';
import { UPLOAD_RATE_LIMIT } from '../lib/rateLimiter.js';
import { canAccessCase, canAccessDocument } from '../lib/authorization.js';

const SERVICE_SUBFOLDER: Record<string, string> = {
  REGISTRATION: 'Registration',
  RETURNS: 'Returns',
  CANCELLATION: 'Cancellation',
  GENERAL: 'General',
};

export async function driveRoutes(app: FastifyInstance) {
  app.patch(
    '/api/admin/team/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const body = z
        .object({
          name: z.string().trim().min(2, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
          email: z.string().trim().email('Enter a valid email address').max(255),
          phone: z.string().trim().max(20).optional(),
        })
        .strict()
        .parse(request.body);

      const safeName = sanitizeText(body.name, 100);
      const safePhone = body.phone ? sanitizeText(body.phone, 20) : null;

      const { data: member, error } = await supabase
        .from('users')
        .update({ name: safeName, email: body.email.toLowerCase(), phone: safePhone })
        .eq('id', id)
        .eq('role', 'TEAM')
        .select('id, name, email, phone, role, must_reset_password')
        .single();

      if (error || !member) return reply.status(404).send({ error: 'Team member not found or could not be updated' });
      return { user: member };
    }
  );

  app.delete(
    '/api/admin/team/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const { data: member } = await supabase.from('users').select('id').eq('id', id).eq('role', 'TEAM').single();
      if (!member) return reply.status(404).send({ error: 'Team member not found' });

      await supabase.from('cases').update({ assigned_team_id: null }).eq('assigned_team_id', id);
      await supabase.from('team_assignments').update({ active: false }).eq('team_user_id', id);

      const { error } = await supabase.from('users').update({ role: 'CLIENT', must_reset_password: false }).eq('id', id).eq('role', 'TEAM');
      if (error) {
        request.log.error({ err: error, teamUserId: id }, 'Failed to remove team member');
        return reply.send({ success: false, error: 'Unable to remove this team member.' });
      }
      return { success: true };
    }
  );

  app.post(
    '/api/admin/team/:id/drive-folder',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const { data: member } = await supabase.from('users').select('id, name').eq('id', id).eq('role', 'TEAM').single();
      if (!member) return reply.status(404).send({ error: 'Team member not found' });
      const { data: existing } = await supabase.from('drive_folders').select('*').eq('owner_type', 'TEAM').eq('owner_id', id).eq('is_shortcut', false).maybeSingle();
      if (existing) return { driveFolder: existing, alreadyExists: true };
      const drive = getDriveService();
      if (!drive) return reply.status(503).send({ error: 'Google Drive not configured' });
      try {
        const folderInfo = await drive.createTeamFolder(id, member.name, request.user.id);
        return { driveFolder: folderInfo, alreadyExists: false };
      } catch (err) {
        request.log.error({ err, teamUserId: id }, 'Failed to create team Drive folder');
        return reply.status(502).send({ error: 'Google Drive folder creation failed. Check the API logs for details.' });
      }
    }
  );

  app.delete(
    '/api/admin/clients/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const { data: client } = await supabase.from('users').select('id').eq('id', id).eq('role', 'CLIENT').single();
      if (!client) return reply.status(404).send({ error: 'Client not found' });
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) return reply.status(500).send({ error: 'Failed to delete client' });
      return { success: true };
    }
  );

  app.post(
    '/api/admin/team',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const body = z
        .object({
          email: z.string().trim().email('Enter a valid email address').max(255),
          name: z.string().trim().min(2, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
          phone: z.string().trim().max(20).optional(),
          password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters'),
          createDriveFolder: z.boolean().default(true),
        })
        .strict()
        .parse(request.body);

      const passwordError = validatePassword(body.password);
      if (passwordError) return reply.status(400).send({ error: passwordError });

      const safeEmail = body.email.toLowerCase();
      const safeName = sanitizeText(body.name, 100);
      const safePhone = body.phone ? sanitizeText(body.phone, 20) : null;

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', safeEmail)
        .single();

      if (existing) return reply.status(409).send({ error: 'User already exists' });

      const passwordHash = await hashPassword(body.password);

      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email: safeEmail,
          name: safeName,
          phone: safePhone,
          role: 'TEAM',
          password_hash: passwordHash,
          email_verified: true,
          must_reset_password: true,
        })
        .select('id, email, name, phone, role, business_name, gstin, state, email_verified, must_reset_password, created_at')
        .single();

      if (error) return reply.status(500).send({ error: 'Failed to create team member' });

      const drive = body.createDriveFolder ? getDriveService() : null;
      let folderInfo = null;
      if (drive) {
        folderInfo = await drive.createTeamFolder(user.id, safeName, request.user.id);
      }

      return { user, driveFolder: folderInfo };
    }
  );

  app.post(
    '/api/admin/clients/:id/drive-folder',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const body = z
        .object({
          businessName: z.string().trim().max(150).optional(),
          existingFolderId: z.string().trim().max(100).regex(/^[a-zA-Z0-9_\-]+$/, 'Invalid Drive folder ID').optional(),
        })
        .strict()
        .parse(request.body);

      const { data: client } = await supabase.from('users').select('*').eq('id', id).single();
      if (!client) return reply.status(404).send({ error: 'Client not found' });

      const drive = getDriveService();
      if (!drive) return reply.status(503).send({ error: 'Google Drive not configured' });

      const businessName = sanitizeText(body.businessName ?? client.business_name ?? client.name, 150);

      const folderInfo = body.existingFolderId
        ? await drive.linkExistingClientFolder(id, body.existingFolderId, request.user.id)
        : await drive.createClientFolder(id, businessName, request.user.id);

      return { driveFolder: folderInfo };
    }
  );

  app.post(
    '/api/admin/assignments',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const body = z
        .object({
          teamUserId: uuidParamSchema,
          clientUserId: uuidParamSchema,
        })
        .strict()
        .parse(request.body);

      let { data: teamFolder } = await supabase
        .from('drive_folders')
        .select('*')
        .eq('owner_type', 'TEAM')
        .eq('owner_id', body.teamUserId)
        .eq('is_shortcut', false)
        .single();

      let { data: clientFolder } = await supabase
        .from('drive_folders')
        .select('*')
        .eq('owner_type', 'CLIENT')
        .eq('owner_id', body.clientUserId)
        .eq('is_shortcut', false)
        .single();

      const { data: team } = await supabase.from('users').select('name').eq('id', body.teamUserId).eq('role', 'TEAM').single();
      const { data: client } = await supabase
        .from('users')
        .select('business_name, name')
        .eq('id', body.clientUserId).eq('role', 'CLIENT')
        .single();
      if (!team || !client) return reply.status(400).send({ error: 'Invalid team member or client' });

      await supabase
        .from('team_assignments')
        .update({ active: false })
        .eq('client_user_id', body.clientUserId)
        .eq('active', true)
        .neq('team_user_id', body.teamUserId);

      const drive = getDriveService();
      if (drive) {
        try {
          if (!teamFolder) {
            const folderInfo = await drive.createTeamFolder(body.teamUserId, team.name, request.user.id);
            const result = await supabase.from('drive_folders').select('*').eq('id', folderInfo.dbId).single();
            teamFolder = result.data;
          }
          if (!clientFolder) {
            const folderInfo = await drive.createClientFolder(body.clientUserId, client.business_name ?? client.name, request.user.id);
            const result = await supabase.from('drive_folders').select('*').eq('id', folderInfo.dbId).single();
            clientFolder = result.data;
          }
          if (teamFolder && clientFolder) {
            await drive.createClientShortcut(
              teamFolder.drive_folder_id,
              clientFolder.drive_folder_id,
              client.business_name ?? client.name,
              teamFolder.id,
              clientFolder.id,
              request.user.id
            );
          }
        } catch (err) {
          request.log.error({ err, teamUserId: body.teamUserId, clientUserId: body.clientUserId }, 'Drive setup failed during client assignment');
        }
      }

      const { data: assignment, error } = await supabase
        .from('team_assignments')
        .upsert(
          {
            team_user_id: body.teamUserId,
            client_user_id: body.clientUserId,
            assigned_by: request.user.id,
            active: true,
          },
          { onConflict: 'team_user_id,client_user_id' }
        )
        .select()
        .single();

      if (error) {
        request.log.error({ err: error, teamUserId: body.teamUserId, clientUserId: body.clientUserId }, 'Failed to create assignment');
        return reply.status(500).send({ error: 'Failed to create assignment' });
      }

      await supabase
        .from('cases')
        .update({ assigned_team_id: body.teamUserId })
        .eq('user_id', body.clientUserId);

      await logActivity(request, {
        actionType: 'ASSIGN',
        actionCategory: 'CHANGED',
        resourceType: 'TEAM_ASSIGNMENT',
        resourceId: assignment.id,
        clientUserId: body.clientUserId,
        clientName: client.business_name || client.name,
        description: `Admin assigned client "${client.business_name || client.name}" to specialist ${team.name}`,
        details: { teamUserId: body.teamUserId, teamName: team.name },
      });

      return { assignment };
    }
  );

  app.get(
    '/api/admin/assignments',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async () => {
      const { data } = await supabase
        .from('team_assignments')
        .select('id, team_user_id, client_user_id')
        .eq('active', true);
      return { assignments: data ?? [] };
    }
  );

  app.delete(
    '/api/admin/assignments/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);

      const { data: assignment } = await supabase
        .from('team_assignments')
        .select('*')
        .eq('id', id)
        .single();

      if (assignment) {
        const { data: shortcuts } = await supabase
          .from('drive_folders')
          .select('*')
          .eq('is_shortcut', true)
          .eq('owner_id', assignment.team_user_id);

        const drive = getDriveService();
        for (const sc of shortcuts ?? []) {
          const { data: target } = await supabase
            .from('drive_folders')
            .select('owner_id')
            .eq('id', sc.target_folder_id)
            .single();
          if (target?.owner_id === assignment.client_user_id && drive && sc.shortcut_drive_id) {
            await drive.removeShortcut(sc.shortcut_drive_id);
            await supabase.from('drive_folders').delete().eq('id', sc.id);
          }
        }

        await supabase.from('team_assignments').update({ active: false }).eq('id', id);
      }

      return { success: true };
    }
  );

  app.get(
    '/api/admin/drive/folders',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async () => {
      const { data } = await supabase.from('drive_folders').select('*, users!drive_folders_owner_id_fkey(name, email)').order('created_at', { ascending: false });
      return { folders: data ?? [] };
    }
  );

  app.delete(
    '/api/admin/drive/folders/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const { data: folder } = await supabase
        .from('drive_folders')
        .select('*')
        .eq('id', id)
        .single();

      if (!folder) return reply.status(404).send({ error: 'Drive folder vault not found' });

      // Attempt Google Drive folder trash/delete if drive service is active
      try {
        const drive = getDriveService();
        if (drive && folder.drive_folder_id) {
          await drive.deleteFolder(folder.drive_folder_id);
        }
      } catch (err: any) {
        request.log.warn({ err, folderId: folder.drive_folder_id }, 'Drive folder delete error');
      }

      // Remove from database
      const { error } = await supabase.from('drive_folders').delete().eq('id', id);
      if (error) return reply.status(500).send({ error: 'Failed to delete drive folder record' });

      return { success: true, deletedId: id };
    }
  );

  app.get(
    '/api/team/clients',
    { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] },
    async (request) => {
      const teamId = request.user.role === 'ADMIN' ? undefined : request.user.id;

      let query = supabase
        .from('team_assignments')
        .select('*, client:users!team_assignments_client_user_id_fkey(id, name, email, business_name)')
        .eq('active', true);

      if (teamId) query = query.eq('team_user_id', teamId);

      const { data: assignments } = await query;

      const clients = await Promise.all(
        (assignments ?? []).map(async (a) => {
          const { data: folder } = await supabase
            .from('drive_folders')
            .select('drive_folder_url')
            .eq('owner_type', 'CLIENT')
            .eq('owner_id', a.client_user_id)
            .eq('is_shortcut', false)
            .single();
          return { ...a.client, driveFolderUrl: folder?.drive_folder_url };
        })
      );

      return { clients };
    }
  );

  app.post(
    '/api/cases/:id/documents',
    { preHandler: authenticate, config: { rateLimit: UPLOAD_RATE_LIMIT } },
    async (request, reply) => {
      const { id: caseId } = z.object({ id: uuidParamSchema }).parse(request.params);
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      // Check for file truncation (oversized file)
      if (data.file.truncated) {
        return reply.status(413).send({ error: 'File size exceeds allowable limit of 25 MB' });
      }

      const { data: caseRecord } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (!caseRecord) return reply.status(404).send({ error: 'Case not found' });

      const authorized = await canAccessCase(request.user, caseRecord);
      if (!authorized) return reply.status(403).send({ error: 'Forbidden' });

      const buffer = await data.toBuffer();
      const validation = validateUploadFile(data.filename, data.mimetype, buffer.length, {
        maxSizeBytes: 25 * 1024 * 1024,
        buffer,
      });

      if (!validation.valid || !validation.sanitizedName) {
        return reply.status(400).send({ error: validation.error || 'Invalid file uploaded' });
      }

      const safeFilename = validation.sanitizedName;

      const { data: clientFolder } = await supabase
        .from('drive_folders')
        .select('*')
        .eq('owner_type', 'CLIENT')
        .eq('owner_id', caseRecord.user_id)
        .eq('is_shortcut', false)
        .single();

      if (!clientFolder) return reply.status(400).send({ error: 'Client Drive folder not set up' });

      const drive = getDriveService();
      if (!drive) return reply.status(503).send({ error: 'Google Drive not configured' });

      const subfolderName = SERVICE_SUBFOLDER[caseRecord.service_type] ?? 'General';
      const targetFolderId = await drive.getClientSubfolder(
        clientFolder.drive_folder_id,
        subfolderName
      );

      const uploaded = await drive.uploadFile(
        targetFolderId,
        safeFilename,
        data.mimetype,
        buffer
      );

      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          case_id: caseId,
          file_name: safeFilename,
          drive_file_id: uploaded.fileId,
          drive_web_view_link: uploaded.webViewLink,
          drive_download_link: uploaded.downloadLink,
          mime_type: data.mimetype,
          uploaded_by: request.user.id,
        })
        .select()
        .single();

      if (error) return reply.status(500).send({ error: 'Failed to save document record' });

      await supabase.from('case_events').insert({
        case_id: caseId,
        note: `Document uploaded: ${safeFilename}`,
        created_by: request.user.id,
      });

      return { document: doc };
    }
  );

  app.get('/api/cases/:id/documents', { preHandler: authenticate }, async (request, reply) => {
    const { id: caseId } = z.object({ id: uuidParamSchema }).parse(request.params);

    const { data: caseRecord } = await supabase.from('cases').select('*').eq('id', caseId).single();
    if (!caseRecord) return reply.status(404).send({ error: 'Case not found' });

    const authorized = await canAccessCase(request.user, caseRecord);
    if (!authorized) return reply.status(403).send({ error: 'Forbidden' });

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('uploaded_at', { ascending: false });

    return { documents: documents ?? [] };
  });

  app.get('/api/documents/:id/download', { preHandler: authenticate }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);

    const docAuth = await canAccessDocument(request.user, id);
    if (!docAuth.document) return reply.status(404).send({ error: 'Document not found' });
    if (!docAuth.authorized || !docAuth.driveFileId) return reply.status(403).send({ error: 'Forbidden' });

    const drive = getDriveService();
    if (!drive) return reply.status(503).send({ error: 'Google Drive not configured' });

    const { stream, mimeType, name } = await drive.downloadFile(docAuth.driveFileId);
    const safeHeaderName = sanitizeHeaderFileName(docAuth.fileName || name);
    reply.header('Content-Type', mimeType);
    reply.header('Content-Disposition', `attachment; filename="${safeHeaderName}"`);
    return reply.send(Readable.from(stream as AsyncIterable<Buffer>));
  });

  app.delete('/api/documents/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);

    const docAuth = await canAccessDocument(request.user, id);
    if (!docAuth.document) return reply.status(404).send({ error: 'Document not found' });
    if (!docAuth.authorized) return reply.status(403).send({ error: 'Forbidden' });

    // 1. Delete from Google Drive if drive file ID exists
    const drive = getDriveService();
    if (drive && docAuth.driveFileId) {
      try {
        await drive.deleteFile(docAuth.driveFileId);
      } catch (err: any) {
        request.log.warn({ err, driveFileId: docAuth.driveFileId }, 'Failed to delete file from Google Drive');
      }
    }

    // 2. Delete database record from appropriate table
    const table = docAuth.source === 'case' ? 'documents' : 'client_documents';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return reply.status(500).send({ error: 'Failed to delete document record' });

    return { success: true, deletedId: id };
  });
}
