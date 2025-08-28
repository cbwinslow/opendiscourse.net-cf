import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function runCommand(command: string): Promise<void> {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { stdio: 'inherit' });
    console.log(output?.toString() || '');
  } catch (error) {
    console.error(`Command failed: ${command}`);
    throw error;
  }
}

async function setupCloudflareResources() {
  console.log('Setting up Cloudflare resources...');

  // Create D1 databases
  console.log('\nCreating D1 databases...');
  await runCommand('npx wrangler d1 create opendiscourse-db');
  await runCommand('npx wrangler d1 create opendiscourse-analytics');

  // Create KV namespaces
  console.log('\nCreating KV namespaces...');
  await runCommand('npx wrangler kv:namespace create CACHE');
  await runCommand('npx wrangler kv:namespace create SESSIONS');

  // Create R2 buckets
  console.log('\nCreating R2 buckets...');
  await runCommand('npx wrangler r2 bucket create opendiscourse-documents');
  await runCommand('npx wrangler r2 bucket create opendiscourse-models');

  // Create Vectorize index
  console.log('\nCreating Vectorize index...');
  await runCommand('npx wrangler vectorize create opendiscourse-vector-index --dimensions=768 --metric=cosine');

  // Create Queue
  console.log('\nCreating Queue...');
  await runCommand('npx wrangler queues create background-tasks');

  console.log('\n✅ Cloudflare resources created successfully!');
  console.log('Please update your .env.local file with the generated IDs and secrets.');
}

setupCloudflareResources().catch(console.error);
