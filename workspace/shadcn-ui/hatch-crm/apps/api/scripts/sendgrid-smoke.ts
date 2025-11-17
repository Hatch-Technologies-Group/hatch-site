import { existsSync } from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import sgMail from '@sendgrid/mail';

const appRoot = path.resolve(__dirname, '..');
const envFiles = ['.env.local', '.env'].map((file) => path.join(appRoot, file));
for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    loadEnv({ path: envFile, override: false });
  }
}

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  throw new Error('SENDGRID_API_KEY is not set. Add it to apps/api/.env and reload your shell.');
}

const to = process.env.SENDGRID_SMOKE_TO ?? process.argv[2];
const from = process.env.SENDGRID_SMOKE_FROM ?? process.argv[3];
const subject = process.env.SENDGRID_SMOKE_SUBJECT ?? 'Hatch CRM SendGrid smoke test';
const bodyText =
  process.env.SENDGRID_SMOKE_TEXT ?? 'Sending with SendGrid is fun (plain text body)';
const bodyHtml =
  process.env.SENDGRID_SMOKE_HTML ??
  '<strong>Sending with SendGrid is fun (HTML body)</strong>';

if (!to) {
  throw new Error('Provide a recipient via SENDGRID_SMOKE_TO or as the first CLI argument.');
}

if (!from) {
  throw new Error('Provide a verified sender via SENDGRID_SMOKE_FROM or as the second CLI argument.');
}

async function main() {
  sgMail.setApiKey(apiKey);

  const msg = {
    to,
    from,
    subject,
    text: bodyText,
    html: bodyHtml
  };

  const [response] = await sgMail.send(msg);
  const headers = response.headers ?? {};
  const messageId =
    (headers['x-message-id'] as string | undefined) ??
    (headers['X-Message-Id'] as string | undefined);

  console.log(`Email accepted by SendGrid with status ${response.statusCode}.`);
  if (messageId) {
    console.log(`Provider message id: ${messageId}`);
  }
}

main().catch((error: unknown) => {
  console.error('Failed to send email via SendGrid:', error);
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'body' in error.response
  ) {
    console.error('SendGrid response body:', JSON.stringify(error.response.body, null, 2));
  }
  process.exitCode = 1;
});
