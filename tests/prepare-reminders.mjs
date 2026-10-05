// Prépare une copie testable de la fonction Deno send-reminders (doublures : pas de réseau, envois enregistrés).
import { readFileSync, writeFileSync } from 'node:fs';
let src = readFileSync(new URL('../supabase/functions/send-reminders/index.ts', import.meta.url), 'utf8');
src = src
  .replace("import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';", 'const createClient: any = () => null;')
  .replace("import webpush from 'npm:web-push@3.6.7';", "export const SENT: any[] = [];\nconst webpush: any = { setVapidDetails() {}, async sendNotification(_s: any, p: string) { if ((globalThis as any).__FAIL_PUSH) { throw { statusCode: 500 }; } SENT.push(JSON.parse(p)); } };")
  .replace('Deno.serve(', 'const _serve = (')
  .replace('async function processUser', 'export async function processUser');
writeFileSync(new URL('./.reminders-fn.ts', import.meta.url), "const Deno: any = { env: { get: () => 'x' } };\n" + src);
