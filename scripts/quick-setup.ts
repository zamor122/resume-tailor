#!/usr/bin/env tsx
// Quick setup helper - guides you through completing setup
// Usage: npx tsx scripts/quick-setup.ts

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

function checkEnvFile() {
  const envPath = join(process.cwd(), '.env.local');
  
  if (!existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    return null;
  }

  return readFileSync(envPath, 'utf-8');
}

function main() {
  console.log('🚀 Setup Completion Helper\n');
  
  const envContent = checkEnvFile();
  if (!envContent) {
    console.log('Please create .env.local first with your environment variables.');
    process.exit(1);
  }

  // Check what's missing
  const hasStripeKey = /^STRIPE_SECRET_KEY=.+$/m.test(envContent);
  const hasPrice24H = /^STRIPE_PRICE_ID_24H=.+$/m.test(envContent);
  const hasPrice5D = /^STRIPE_PRICE_ID_5D=.+$/m.test(envContent);
  const hasPrice14D = /^STRIPE_PRICE_ID_14D=.+$/m.test(envContent);
  const hasWebhookSecret = /^STRIPE_WEBHOOK_SECRET=.+$/m.test(envContent);

  console.log('📋 Current Status:\n');
  console.log(`   STRIPE_SECRET_KEY: ${hasStripeKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   STRIPE_PRICE_ID_24H: ${hasPrice24H ? '✅ Set' : '❌ Missing'}`);
  console.log(`   STRIPE_PRICE_ID_5D: ${hasPrice5D ? '✅ Set' : '❌ Missing'}`);
  console.log(`   STRIPE_PRICE_ID_14D: ${hasPrice14D ? '✅ Set' : '❌ Missing'}`);
  console.log(`   STRIPE_WEBHOOK_SECRET: ${hasWebhookSecret ? '✅ Set' : '❌ Missing'}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!hasStripeKey) {
    console.log('1️⃣  ADD STRIPE SECRET KEY:\n');
    console.log('   a) Go to: https://dashboard.stripe.com/apikeys');
    console.log('   b) Copy your "Secret key" (starts with sk_test_ or sk_live_)');
    console.log('   c) Add to .env.local:');
    console.log('      STRIPE_SECRET_KEY=sk_test_...\n');
    console.log('   Then run: npx tsx scripts/complete-setup.ts\n');
  } else if (!hasPrice24H || !hasPrice5D || !hasPrice14D) {
    console.log('1️⃣  RETRIEVE STRIPE PRICE IDs:\n');
    console.log('   Run: npx tsx scripts/complete-setup.ts');
    console.log('   This will automatically add the price IDs to .env.local\n');
  }

  if (!hasWebhookSecret) {
    console.log('2️⃣  CONFIGURE STRIPE WEBHOOK:\n');
    console.log('   For Production:');
    console.log('   a) Go to: https://dashboard.stripe.com/webhooks');
    console.log('   b) Click "Add endpoint"');
    console.log('   c) URL: https://yourdomain.com/api/stripe/webhook');
    console.log('   d) Select events: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed');
    console.log('   e) Copy the "Signing secret" (whsec_...)');
    console.log('   f) Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_...\n');
    console.log('   For Local Development:');
    console.log('   Run: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('   Copy the webhook secret from the output and add to .env.local\n');
  }

  console.log('3️⃣  RUN SUPABASE SQL SCHEMA:\n');
  console.log('   a) Go to: Supabase Dashboard > SQL Editor > New Query');
  console.log('   b) Open: scripts/supabase-schema.sql');
  console.log('   c) Copy entire contents and paste into SQL Editor');
  console.log('   d) Click "Run"\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (hasStripeKey && hasPrice24H && hasPrice5D && hasPrice14D && hasWebhookSecret) {
    console.log('✅ All Stripe configuration complete!');
    console.log('   Make sure Supabase SQL schema has been executed.\n');
  } else {
    console.log('📝 See SETUP_COMPLETION_GUIDE.md for detailed instructions.\n');
  }
}

main();





