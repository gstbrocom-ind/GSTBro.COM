import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface InstantCallbackEmailPayload {
  name: string;
  phone: string;
  sourceUrl?: string;
  destinationEmail?: string;
}

export async function sendInstantCallbackAlert(payload: InstantCallbackEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { name, phone, sourceUrl, destinationEmail } = payload;
  const recipient = (destinationEmail && destinationEmail.trim()) || 'gstbro.com@gmail.com';
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const formattedPhone = cleanPhone.length === 10 
    ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` 
    : phone;

  const nowIst = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  const subject = `🚨 URGENT LEAD: Instant Callback Request from ${name} (${formattedPhone})`;

  const waText = encodeURIComponent(
    `Hello ${name}, this is GSTBro following up on your instant consultation request. How can our Senior CA team assist with your GST compliance or notice today?`
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Top Alert Banner -->
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
      <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fecaca; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px;">
        ⚡ Instant CA Hotline Alert
      </span>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
        New Callback Lead Received
      </h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #bfdbfe;">
        A website visitor has requested an immediate call back within 5 minutes.
      </p>
    </div>

    <!-- Lead Details Card -->
    <div style="padding: 28px 24px;">
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 35%;">Client Name</td>
            <td style="padding: 8px 0; font-size: 16px; font-weight: 800; color: #0f172a;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Mobile Number</td>
            <td style="padding: 8px 0; font-size: 17px; font-weight: 800; color: #2563eb; letter-spacing: 0.5px;">${formattedPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Request Time</td>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #334155;">${nowIst}</td>
          </tr>
          ${sourceUrl ? `
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Source Page</td>
            <td style="padding: 8px 0; font-size: 12px; color: #64748b; word-break: break-all;">
              <a href="${sourceUrl}" style="color: #2563eb; text-decoration: none;">${sourceUrl}</a>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Quick Action Buttons -->
      <div style="text-align: center; margin: 30px 0 10px 0;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <a href="tel:+91${cleanPhone}" style="display: block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 800; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                📞 Call Client Now
              </a>
            </td>
            <td style="width: 50%; text-align: center;">
              <a href="https://wa.me/91${cleanPhone}?text=${waText}" style="display: block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 800; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.35);">
                💬 WhatsApp Chat
              </a>
            </td>
          </tr>
        </table>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      GSTBro Automated Hotline Notification • Dispatched immediately to ${recipient}
    </div>

  </div>
</body>
</html>
  `.trim();

  if (!resend) {
    console.warn(`[HOTLINE ALERT] Resend API key is not configured. Email to ${recipient} simulated. Lead: ${name} (${formattedPhone})`);
    return { success: true, messageId: 'simulated' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: recipient,
      subject,
      html,
    });

    if (error) {
      console.error('[HOTLINE ALERT] Resend delivery error:', error);
      return { success: false, error: error.message };
    }

    console.info(`[HOTLINE ALERT] Instant callback email delivered to ${recipient} (id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[HOTLINE ALERT] Exception while dispatching email:', err);
    return { success: false, error: errorMsg };
  }
}

export interface StrategyCallEmailPayload {
  name: string;
  phone: string;
  language: string;
  callTime: string;
  notes?: string;
  sourceUrl?: string;
  destinationEmail?: string;
}

export async function sendStrategyCallAlert(payload: StrategyCallEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { name, phone, language, callTime, notes, sourceUrl, destinationEmail } = payload;
  const recipient = (destinationEmail && destinationEmail.trim()) || 'gstbro.com@gmail.com';
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const formattedPhone = cleanPhone.length === 10
    ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
    : phone;

  const isCallNow = callTime.toLowerCase().includes('now') || callTime.toLowerCase().includes('instant');

  const nowIst = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  const subject = isCallNow
    ? `🚨 URGENT: 15-Min CA Strategy Call Request from ${name} (${formattedPhone}) - CALL NOW [${language}]`
    : `📅 SCHEDULED: 15-Min CA Strategy Call from ${name} (${formattedPhone}) - ${callTime} [${language}]`;

  const waGreeting = language.toLowerCase().includes('telugu')
    ? `నమస్కారం ${name} గారు, GSTBro నుంచి సీనియర్ CA టీమ్ సంప్రదిస్తోంది.`
    : language.toLowerCase().includes('tamil')
    ? `வணக்கம் ${name}, GSTBro Senior CA team following up on your strategy call request.`
    : language.toLowerCase().includes('hindi')
    ? `नमस्ते ${name} जी, GSTBro से सीनियर चार्टर्ड अकाउंटेंट टीम आपकी 15-Min Strategy Call के संदर्भ में संपर्क कर रही है।`
    : `Hello ${name}, this is GSTBro following up on your requested 15-Min CA Strategy Call.`;

  const waText = encodeURIComponent(
    `${waGreeting} We are ready to assist with your GST compliance, notice defense, and input tax credit.`
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Top Alert Banner -->
    <div style="background: ${isCallNow ? 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #b91c1c 100%)' : 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)'}; padding: 28px 24px; text-align: center; color: #ffffff;">
      <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.4); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px;">
        ${isCallNow ? '⚡ URGENT CA HOTLINE • CALL RIGHT NOW' : '🎯 15-MIN CA STRATEGY CALL'}
      </span>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
        ${isCallNow ? 'Immediate CA Consultation Requested' : 'New Strategy Call Scheduled'}
      </h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${isCallNow ? '#fee2e2' : '#c7d2fe'};">
        Client requested a dedicated consultation in <strong style="color: #ffffff;">${language}</strong>.
      </p>
    </div>

    <!-- Lead Details Card -->
    <div style="padding: 28px 24px;">
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 38%;">Client Name</td>
            <td style="padding: 8px 0; font-size: 17px; font-weight: 800; color: #0f172a;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Mobile Number</td>
            <td style="padding: 8px 0; font-size: 18px; font-weight: 800; color: #2563eb; letter-spacing: 0.5px;">${formattedPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Preferred Language</td>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; background-color: #ede9fe; color: #5b21b6; border: 1px solid #c4b5fd; font-weight: 800; font-size: 13px; padding: 3px 10px; border-radius: 6px;">
                🗣️ ${language}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Requested Call Time</td>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; background-color: ${isCallNow ? '#fee2e2' : '#dbeafe'}; color: ${isCallNow ? '#991b1b' : '#1e40af'}; border: 1px solid ${isCallNow ? '#fca5a5' : '#bfdbfe'}; font-weight: 800; font-size: 14px; padding: 4px 10px; border-radius: 6px;">
                ${isCallNow ? '⚡ CALL RIGHT NOW (within 5-15 mins)' : `📅 ${callTime}`}
              </span>
            </td>
          </tr>
          ${notes ? `
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b; vertical-align: top;">Client Query / Topic</td>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #334155; line-height: 1.5;">${notes}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Submission Time</td>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #334155;">${nowIst}</td>
          </tr>
          ${sourceUrl ? `
          <tr>
            <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Source Page</td>
            <td style="padding: 8px 0; font-size: 12px; color: #64748b; word-break: break-all;">
              <a href="${sourceUrl}" style="color: #2563eb; text-decoration: none;">${sourceUrl}</a>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Quick Action Buttons -->
      <div style="text-align: center; margin: 30px 0 10px 0;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <a href="tel:+91${cleanPhone}" style="display: block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 800; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                📞 Call Client Now
              </a>
            </td>
            <td style="width: 50%; text-align: center;">
              <a href="https://wa.me/91${cleanPhone}?text=${waText}" style="display: block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 800; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.35);">
                💬 WhatsApp Chat
              </a>
            </td>
          </tr>
        </table>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      GSTBro Strategy Hotline Notification • Dispatched immediately to ${recipient}
    </div>

  </div>
</body>
</html>
  `.trim();

  if (!resend) {
    console.warn(`[STRATEGY CALL ALERT] Resend API key is not configured. Email to ${recipient} simulated. Lead: ${name} (${formattedPhone}) - Lang: ${language} - Time: ${callTime}`);
    return { success: true, messageId: 'simulated' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: recipient,
      subject,
      html,
    });

    if (error) {
      console.error('[STRATEGY CALL ALERT] Resend delivery error:', error);
      return { success: false, error: error.message };
    }

    console.info(`[STRATEGY CALL ALERT] Email delivered to ${recipient} (id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[STRATEGY CALL ALERT] Exception while dispatching email:', err);
    return { success: false, error: errorMsg };
  }
}
