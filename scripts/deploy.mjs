/**
 * Deploy script for Cloudflare Pages
 *
 * Copies dist/ to a temp folder and runs wrangler pages deploy
 * from outside the project to avoid conflicts with the functions/ folder.
 *
 * Required env vars (set in .env):
 *   CLOUDFLARE_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID
 */

import { execSync } from 'node:child_process';
import { cpSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Load .env manually (no dotenv dependency needed)
const envPath = resolve('.env');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const token = process.env.CLOUDFLARE_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.error('❌ Missing CLOUDFLARE_TOKEN or CLOUDFLARE_ACCOUNT_ID in .env');
  process.exit(1);
}

const distDir = resolve('dist');
const tempDir = join(tmpdir(), 'bound-deploy');

if (!existsSync(distDir)) {
  console.error('❌ dist/ folder not found. Run "npm run build" first.');
  process.exit(1);
}

// Copy dist to temp (avoids wrangler scanning functions/ folder)
console.log('📦 Copying dist/ to temp folder...');
if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
cpSync(distDir, tempDir, { recursive: true });

// Deploy
console.log('🚀 Deploying to Cloudflare Pages...');
try {
  execSync(
    `wrangler pages deploy "${tempDir}" --project-name bound --branch main --commit-dirty=true`,
    {
      stdio: 'inherit',
      cwd: tempDir,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ACCOUNT_ID: accountId,
      },
    },
  );
  console.log('\n✅ Deploy complete! Site: https://bound-bnb.pages.dev');
} catch {
  console.error('\n❌ Deploy failed.');
  process.exit(1);
}
