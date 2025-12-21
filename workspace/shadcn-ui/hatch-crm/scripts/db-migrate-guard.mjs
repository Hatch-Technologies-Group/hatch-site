import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT_DIR = process.cwd();
const ENV_FILES = ['.env', '.env.local'].map((name) => path.join(ROOT_DIR, name));

function parseEnvFile(contents) {
  const result = {};
  const lines = contents.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    if (!key) continue;
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadEnvFiles() {
  const merged = {};
  for (const filePath of ENV_FILES) {
    if (!fs.existsSync(filePath)) continue;
    const contents = fs.readFileSync(filePath, 'utf8');
    Object.assign(merged, parseEnvFile(contents));
  }
  return merged;
}

function resolveEnvValue(key, fileEnv) {
  const fromProcess = process.env[key];
  if (typeof fromProcess === 'string' && fromProcess.length > 0) return fromProcess;
  const fromFile = fileEnv[key];
  if (typeof fromFile === 'string' && fromFile.length > 0) return fromFile;
  return null;
}

function normalizeBool(value) {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function parseDatabaseTarget(databaseUrl) {
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || '(missing-db-name)';
  const host = url.hostname || '(missing-host)';
  const port = url.port ? Number(url.port) : null;
  const schema = url.searchParams.get('schema');
  return { host, port, database, schema };
}

const fileEnv = loadEnvFiles();

const dbEnvRaw = resolveEnvValue('DB_ENV', fileEnv);
const dbEnv = dbEnvRaw ? dbEnvRaw.trim().toLowerCase() : null;

if (!dbEnv || !['staging', 'prod', 'dev'].includes(dbEnv)) {
  console.error('[db:migrate] Refusing to run: set DB_ENV to one of: staging | prod | dev.');
  console.error('[db:migrate] Example (staging): DB_ENV=staging pnpm -C workspace/shadcn-ui/hatch-crm db:migrate');
  process.exit(1);
}

const understandsProd = normalizeBool(resolveEnvValue('I_UNDERSTAND_MIGRATING_PROD', fileEnv));

if (dbEnv !== 'staging' && !understandsProd) {
  console.error('[db:migrate] Refusing to run: DB_ENV is not "staging" and I_UNDERSTAND_MIGRATING_PROD is not true.');
  console.error('[db:migrate] For staging, run with DB_ENV=staging.');
  console.error('[db:migrate] For production, set: DB_ENV=prod I_UNDERSTAND_MIGRATING_PROD=true');
  process.exit(1);
}

const databaseUrl = resolveEnvValue('DATABASE_URL', fileEnv);
if (!databaseUrl) {
  console.error('[db:migrate] Refusing to run: DATABASE_URL is missing.');
  process.exit(1);
}

let target;
try {
  target = parseDatabaseTarget(databaseUrl);
} catch (error) {
  console.error('[db:migrate] Refusing to run: DATABASE_URL could not be parsed as a URL.');
  process.exit(1);
}

const portSuffix = target.port ? `:${target.port}` : '';
const schemaSuffix = target.schema ? ` (schema=${target.schema})` : '';

console.log(`[db:migrate] DB_ENV=${dbEnv}`);
console.log(`[db:migrate] Target database: ${target.host}${portSuffix}/${target.database}${schemaSuffix}`);
console.log(
  `[db:migrate] Safety override: I_UNDERSTAND_MIGRATING_PROD=${understandsProd ? 'true' : 'false'}`
);
console.log('[db:migrate] Running: pnpm --filter @hatch/db migrate');

const child = spawn('pnpm', ['--filter', '@hatch/db', 'migrate'], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  env: {
    ...process.env,
    ...fileEnv
  }
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

