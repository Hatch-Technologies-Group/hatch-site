// apps/api/src/modules/voice/voice.service.ts

import twilio, { type Twilio } from 'twilio';

// Lazily resolve env + client to ensure values loaded by ConfigModule are picked up.
let cachedClient: Twilio | null = null;

function resolveFromNumber(): string | undefined {
  return process.env.TWILIO_FROM_NUMBER;
}

function resolveAnswerUrl(): string | undefined {
  const url = process.env.TWILIO_VOICE_ANSWER_URL;
  return url && url.trim().length > 0 ? url.trim() : undefined;
}

function resolveInlineTwiml(): string {
  // Allow override; otherwise provide a sensible default
  const override = process.env.TWILIO_VOICE_TWIML;
  if (override && override.trim().startsWith('<Response')) return override.trim();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice">This is Hatch calling on behalf of your agent. They will join shortly.</Say>\n</Response>`;
}

function getVoiceClient(): Twilio | null {
  if (cachedClient) return cachedClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  cachedClient = twilio(sid, token);
  return cachedClient;
}

export type StartCallParams = {
  to: string; // Lead phone number in E.164 format, e.g. +16456002049
  tenantId?: string; // optional for logging
};

export class VoiceService {
  static async startCall({ to, tenantId }: StartCallParams) {
    const client = getVoiceClient();
    if (!client) {
      // eslint-disable-next-line no-console
      console.error('❌ Twilio voice client not initialized (check env vars).');
      return { success: false as const, error: 'Twilio not configured' };
    }

    try {
      const from = resolveFromNumber();
      if (!from) {
        // eslint-disable-next-line no-console
        console.error('❌ TWILIO_FROM_NUMBER is not set.');
        return { success: false as const, error: 'Missing TWILIO_FROM_NUMBER' };
      }

      const useInline = (process.env.TWILIO_VOICE_USE_INLINE ?? 'false').toLowerCase() === 'true';
      const answerUrl = resolveAnswerUrl();

      const createArgs: any = {
        from,
        to
      };

      if (useInline || !answerUrl) {
        createArgs.twiml = resolveInlineTwiml();
      } else {
        createArgs.url = answerUrl; // Twilio fetches TwiML here when the call connects
      }

      // Optional: status callback for better visibility
      const statusUrl = process.env.TWILIO_STATUS_CALLBACK_URL;
      if (statusUrl && statusUrl.trim().length > 0) {
        createArgs.statusCallback = statusUrl.trim();
        createArgs.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed', 'busy', 'failed', 'no-answer', 'canceled'];
        createArgs.statusCallbackMethod = 'POST';
      }

      const call = await client.calls.create(createArgs);

      // eslint-disable-next-line no-console
      console.log(
        `📞 Voice call started to ${to} (sid=${call.sid})` + (tenantId ? ` [tenant=${tenantId}]` : '')
      );

      return { success: true as const, sid: call.sid };
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('❌ Twilio Voice Error:', err);
      return { success: false as const, error: err };
    }
  }
}

export default VoiceService;
