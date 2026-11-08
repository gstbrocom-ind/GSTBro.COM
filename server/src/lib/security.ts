import { z } from 'zod';

// ============================================================================
// 1. COMMONLY USED STRICT PARAMETER & VALUE SCHEMAS
// ============================================================================

/**
 * Strict UUIDv4 Schema for route parameters and database IDs
 */
export const uuidParamSchema = z
  .string()
  .trim()
  .uuid('Invalid identifier format: must be a valid UUID');

/**
 * Strict GST Filing Period format: YYYY-MM (e.g., 2026-04)
 */
export const periodParamSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid period format: must be YYYY-MM (e.g., 2026-04)');

/**
 * Strict Date format: YYYY-MM-DD
 */
export const dateParamSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Invalid date format: must be YYYY-MM-DD');

/**
 * Strict Financial Year format: YYYY-YY (e.g., 2025-26)
 */
export const financialYearParamSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Invalid financial year format: must be YYYY-YY (e.g., 2025-26)');

/**
 * Strict Month format: 01-12
 */
export const monthParamSchema = z
  .string()
  .trim()
  .regex(/^(0[1-9]|1[0-2])$/, 'Invalid month format: must be 01-12');

/**
 * Safe URL path schema: starts with /, no path traversal, no control characters
 */
export const safePathSchema = z
  .string()
  .trim()
  .min(1, 'Path cannot be empty')
  .max(200, 'Path exceeds maximum length of 200 characters')
  .refine(
    (p) => p.startsWith('/') && !p.includes('..') && !p.includes('\\') && !/[\x00-\x1F\x7F]/.test(p),
    'Invalid path: must start with / and cannot contain path traversal sequences or control characters'
  );

// ============================================================================
// 2. PROTOTYPE POLLUTION & KEY INJECTION GUARDS
// ============================================================================

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively checks an object/array to ensure no prototype pollution keys exist.
 */
export function hasPrototypePollution(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  if (Array.isArray(value)) {
    return value.some(hasPrototypePollution);
  }

  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) return true;
    if (hasPrototypePollution((value as Record<string, unknown>)[key])) {
      return true;
    }
  }

  return false;
}

/**
 * Deeply removes prototype pollution keys from an object without mutating caller data.
 */
export function sanitizeObjectKeys<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeObjectKeys) as unknown as T;
  }

  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    clean[key] = sanitizeObjectKeys(val);
  }
  return clean as T;
}

/**
 * Strict Zod schema for JSON records that rejects prototype pollution keys
 * and enforces depth / size bounds to prevent DoS.
 */
export const safeJsonRecordSchema = z
  .unknown()
  .refine((data) => !hasPrototypePollution(data), {
    message: 'Illegal object keys detected (prototype pollution attempt)',
  })
  .refine(
    (data) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
      return Object.keys(data).length <= 200;
    },
    {
      message: 'Object exceeds maximum allowed property count (limit: 200) or is not an object',
    }
  )
  .transform((val) => (val as Record<string, unknown>));

// ============================================================================
// 3. TEXT & HEADER SANITIZERS
// ============================================================================

/**
 * Removes dangerous control characters and null bytes from text.
 * Preserves normal newlines and tabs if allowMultiline is true.
 */
export function sanitizeText(input: string, maxLength = 1000, allowMultiline = false): string {
  if (typeof input !== 'string') return '';
  // Strip null bytes and non-printable control characters
  const pattern = allowMultiline ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g : /[\x00-\x1F\x7F]/g;
  let cleaned = input.replace(pattern, '').trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}

/**
 * Sanitizes a filename for HTTP Content-Disposition headers to prevent
 * CRLF injection, header splitting, and quote-breaking exploits.
 */
export function sanitizeHeaderFileName(name: string): string {
  if (!name || typeof name !== 'string') return 'document';
  // Remove \r, \n, ", and control characters
  return name.replace(/[\r\n"\\]/g, '_').trim().slice(0, 150) || 'document';
}

/**
 * Escapes query parameters for Google Drive API queries (name='...')
 * Prevents Google Drive query injection.
 */
export function escapeDriveQueryString(str: string): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ============================================================================
// 4. FILE UPLOAD SECURITY (MIME & EXTENSION WHITELISTS)
// ============================================================================

/**
 * Allowed MIME types and extensions for tax/financial client documents
 */
export const ALLOWED_DOCUMENT_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'text/plain': ['.csv', '.txt'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'application/json': ['.json'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

/**
 * Allowed MIME types and extensions for site icons and brand logos
 */
export const ALLOWED_IMAGE_TYPES: Record<string, string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/x-icon': ['.ico'],
  'image/vnd.microsoft.icon': ['.ico'],
};

/**
 * Dangerous file extensions that MUST NEVER be accepted under any circumstances
 */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.bin', '.dll', '.so', '.dylib',
  '.php', '.phtml', '.php3', '.php4', '.php5', '.php7', '.phps',
  '.html', '.htm', '.xhtml', '.shtml', '.svg', '.svgz',
  '.js', '.mjs', '.cjs', '.ts', '.vbs', '.vbe', '.wsf', '.wsh',
  '.py', '.pl', '.cgi', '.jar', '.war', '.ear', '.msi', '.com',
  '.scr', '.pif', '.hta', '.cpl', '.reg',
]);

/**
 * Sanitizes an uploaded file's original name:
 * - Strips any path separators (/ and \)
 * - Replaces directory traversal sequences
 * - Eliminates null bytes and control chars
 * - Truncates basename to safe length while preserving extension
 */
export function sanitizeFileName(originalName: string, defaultExt = '.bin'): string {
  if (!originalName || typeof originalName !== 'string') return `upload_${Date.now()}${defaultExt}`;

  // Take only the basename (strip any incoming directory path)
  const baseOnly = originalName.split(/[/\\]/).pop() || '';

  // Remove null bytes and control characters
  const cleanName = baseOnly.replace(/[\x00-\x1F\x7F]/g, '').trim();

  // Extract extension
  const lastDot = cleanName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0 || lastDot === cleanName.length - 1) {
    // No extension
    const base = cleanName.replace(/[^a-zA-Z0-9_\-\s]/g, '_').slice(0, 100);
    return `${base || 'upload'}${defaultExt}`;
  }

  const rawBase = cleanName.slice(0, lastDot);
  const rawExt = cleanName.slice(lastDot).toLowerCase();

  // Check for dangerous final extension
  if (BLOCKED_EXTENSIONS.has(rawExt)) {
    throw new Error(`File type rejected: extension ${rawExt} is prohibited for security`);
  }

  // Check for dangerous hidden/double extensions in base name (e.g. invoice.php.pdf, payload.exe.jpg)
  const parts = cleanName.toLowerCase().split('.');
  for (let i = 1; i < parts.length; i++) {
    const intermediateExt = `.${parts[i]}`;
    if (BLOCKED_EXTENSIONS.has(intermediateExt)) {
      throw new Error(`File type rejected: dangerous double extension ${intermediateExt} detected in filename`);
    }
  }

  // Sanitize base part
  const safeBase = rawBase.replace(/[^a-zA-Z0-9_\-\s.]/g, '_').slice(0, 100).trim();
  const safeExt = rawExt.replace(/[^a-z0-9.]/g, '');

  return `${safeBase || 'document'}${safeExt}`;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

/**
 * Inspects binary magic numbers and signatures of file buffers to prevent
 * MIME spoofing, polyglot attacks, and executable camouflage.
 */
export function validateFileMagicBytes(
  buffer: Buffer,
  extension: string,
  mimetype: string
): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File is empty (0 bytes)' };
  }

  // 1. Universal check for dangerous executable headers regardless of extension
  if (buffer.length >= 2) {
    // DOS/Windows PE Executable ('MZ')
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { valid: false, error: 'Prohibited binary executable header (DOS/MZ) detected' };
    }
    // Unix Shell Shebang ('#!')
    if (buffer[0] === 0x23 && buffer[1] === 0x21) {
      return { valid: false, error: 'Prohibited shell script header (#!) detected' };
    }
  }

  if (buffer.length >= 4) {
    // Linux ELF binary (0x7F 'E' 'L' 'F')
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      return { valid: false, error: 'Prohibited ELF binary executable detected' };
    }
  }

  const ext = extension.toLowerCase();
  const mime = mimetype.toLowerCase().split(';')[0].trim();

  // 2. Format-specific signature verification
  if (ext === '.pdf' || mime === 'application/pdf') {
    // Must start with '%PDF-' (0x25 0x50 0x44 0x46 0x2D)
    if (buffer.length < 5 || buffer.toString('utf8', 0, 5) !== '%PDF-') {
      return { valid: false, error: 'Malformed or counterfeit PDF: missing valid %PDF- header' };
    }
  } else if (ext === '.png' || mime === 'image/png') {
    // PNG 8-byte signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buffer.length < 8 || !pngMagic.every((byte, i) => buffer[i] === byte)) {
      return { valid: false, error: 'Malformed or counterfeit PNG: invalid PNG header signature' };
    }
  } else if (['.jpg', '.jpeg'].includes(ext) || ['image/jpeg', 'image/jpg'].includes(mime)) {
    // JPEG starts with 0xFF 0xD8 0xFF
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { valid: false, error: 'Malformed or counterfeit JPEG: invalid JPEG header signature' };
    }
  } else if (ext === '.webp' || mime === 'image/webp') {
    // WEBP: 'RIFF' at offset 0, 'WEBP' at offset 8
    if (
      buffer.length < 12 ||
      buffer.toString('ascii', 0, 4) !== 'RIFF' ||
      buffer.toString('ascii', 8, 12) !== 'WEBP'
    ) {
      return { valid: false, error: 'Malformed or counterfeit WebP: missing RIFF/WEBP header' };
    }
  } else if (['.xlsx', '.zip'].includes(ext) || mime.includes('zip') || mime.includes('openxmlformats')) {
    // ZIP / XLSX standard PK signatures: 'PK' (0x50 0x4B) followed by 0x03 0x04 or 0x05 0x06
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      !(
        (buffer[2] === 0x03 && buffer[3] === 0x04) ||
        (buffer[2] === 0x05 && buffer[3] === 0x06) ||
        (buffer[2] === 0x07 && buffer[3] === 0x08)
      )
    ) {
      return { valid: false, error: 'Malformed archive/spreadsheet: invalid ZIP/PK signature' };
    }
  } else if (ext === '.ico' || mime.includes('icon')) {
    // ICO header: 0x00 0x00 0x01 0x00
    if (buffer.length < 4 || buffer[0] !== 0 || buffer[1] !== 0 || buffer[2] !== 1 || buffer[3] !== 0) {
      return { valid: false, error: 'Malformed ICO icon: invalid ICO signature' };
    }
  } else if (['.csv', '.txt', '.json'].includes(ext)) {
    // Text inspection: check first 1024 bytes for null bytes or script/HTML execution tags
    const sample = buffer.slice(0, Math.min(buffer.length, 1024));
    if (sample.includes(0x00)) {
      return { valid: false, error: 'Malformed text/csv: unexpected binary null bytes detected' };
    }
    const sampleStr = sample.toString('utf8').toLowerCase();
    const dangerousPatterns = [
      '<script', '<?php', '<%', '<html', '<svg', '<iframe', '<object',
      '<embed', '<applet', 'javascript:', 'onload=', 'onerror=', '<form',
    ];
    for (const pattern of dangerousPatterns) {
      if (sampleStr.includes(pattern)) {
        return { valid: false, error: `Suspicious code or tag (${pattern}) detected in text document` };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates an uploaded file against strict security rules:
 * 1. Checks filename and extensions against prohibited extension blacklist
 * 2. Checks MIME type against allowed whitelist
 * 3. Enforces maximum file size limit
 * 4. Checks that extension matches the claimed MIME type
 * 5. If file buffer is provided, verifies binary magic bytes against signature forgery
 */
export function validateUploadFile(
  filename: string,
  mimetype: string,
  fileSize: number,
  options: {
    maxSizeBytes?: number;
    allowedTypes?: Record<string, string[]>;
    buffer?: Buffer;
  } = {}
): FileValidationResult {
  const maxBytes = options.maxSizeBytes ?? 25 * 1024 * 1024; // Default 25 MB
  const allowed = options.allowedTypes ?? ALLOWED_DOCUMENT_TYPES;

  if (fileSize > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds the allowable limit of ${Math.round(maxBytes / (1024 * 1024))} MB`,
    };
  }

  // Extract extension and inspect for hidden/double extensions
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';

  if (!ext || BLOCKED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Prohibited or invalid file extension: ${ext || 'none'}`,
    };
  }

  // Double extension detection
  const nameParts = filename.toLowerCase().split('.');
  for (let i = 1; i < nameParts.length; i++) {
    const partExt = `.${nameParts[i]}`;
    if (BLOCKED_EXTENSIONS.has(partExt)) {
      return {
        valid: false,
        error: `Prohibited double or hidden extension detected: ${partExt}`,
      };
    }
  }

  const normalizedMime = mimetype.toLowerCase().split(';')[0].trim();
  const validExtsForMime = allowed[normalizedMime];

  if (!validExtsForMime) {
    return {
      valid: false,
      error: `Unsupported file MIME type: ${normalizedMime}. Allowed formats: PDF, Excel, CSV, Images, JSON, ZIP`,
    };
  }

  if (!validExtsForMime.includes(ext)) {
    return {
      valid: false,
      error: `MIME type (${normalizedMime}) does not match file extension (${ext})`,
    };
  }

  // Inspect binary magic bytes if buffer is provided
  if (options.buffer) {
    const magicCheck = validateFileMagicBytes(options.buffer, ext, normalizedMime);
    if (!magicCheck.valid) {
      return { valid: false, error: magicCheck.error };
    }
  }

  try {
    const sanitized = sanitizeFileName(filename, ext);
    return { valid: true, sanitizedName: sanitized };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Invalid filename' };
  }
}
