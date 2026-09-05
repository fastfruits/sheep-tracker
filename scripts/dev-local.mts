import { spawn } from 'node:child_process';
import { readLocalSupabaseEnv } from '../tests/helpers/local-env';

/**
 * `next dev` pointed at the local Supabase stack instead of the hosted project.
 *
 * The plain `npm run dev` reads `.env`, which holds production credentials.
 * Rather than shadowing that with a `.env.local` that silently changes what
 * `npm run dev` means, this is an explicit opt-in: the values are injected into
 * the child process, where they beat any .env file.
 */
const env = readLocalSupabaseEnv();

console.log(`next dev → ${env.NEXT_PUBLIC_SUPABASE_URL}`);

spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  env: { ...process.env, ...env, SMS_TRANSPORT: 'outbox' },
}).on('exit', code => process.exit(code ?? 0));
