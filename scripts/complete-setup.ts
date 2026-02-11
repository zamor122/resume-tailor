// Complete setup script - retrieves Stripe price IDs and provides next steps
// Usage: npx tsx scripts/complete-setup.ts

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import Stripe from 'stripe';

// Load .env.local into process.env
try {
  const envPath = join(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  // Ignore errors loading env file
}

async function completeSetup() {
  const envPath = join(process.cwd(), '.env.local');
  
  // Load existing .env.local
  let envContent = '';
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  } else {
    console.log('❌ .env.local file not found');
    console.log('   Please create it first with your environment variables');
    process.exit(1);
  }

  // Parse .env.local file - handle comments and different formats
  const envVars: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    // Skip empty lines
    const trimmed = line.trim();
    if (!trimmed) return;
    
    // Only treat # as comment if it's at the start of the line (after trimming)
    if (trimmed.startsWith('#')) return;
    
    // Parse KEY=VALUE format - take everything after = as value (even if it contains #)
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      // Get the value - don't split on # since it might be part of the value
      let value = match[2].trim();
      // Remove surrounding quotes if present
      value = value.replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });

  // Check if STRIPE_SECRET_KEY is set (check both parsed vars and process.env)
  const stripeSecretKey = envVars.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || !stripeSecretKey.trim()) {
    console.log('❌ STRIPE_SECRET_KEY not found in .env.local');
    console.log('\n📋 Please add your Stripe secret key to .env.local:');
    console.log('   STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)');
    console.log('\n   Get it from: https://dashboard.stripe.com/apikeys');
    console.log('   Then run this script again.');
    console.log('\n   Debug: Found keys:', Object.keys(envVars).filter(k => k.includes('STRIPE')).join(', ') || 'none');
    process.exit(1);
  }
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
  });

  console.log('🚀 Retrieving Stripe price IDs...\n');

  const PRODUCTS = [
    { name: '24-Hour Sprint', tier: '24H' },
    { name: '5-Day Power Week', tier: '5D' },
    { name: '14-Day Career Mode', tier: '14D' },
  ];

  const priceIds: Record<string, string> = {};

  try {
    // Get all products
    const products = await stripe.products.list({ limit: 100 });
    
    for (const productConfig of PRODUCTS) {
      const product = products.data.find(p => p.name === productConfig.name);
      
      if (!product) {
        console.log(`⚠️  Product "${productConfig.name}" not found. Run setup-stripe.ts first.`);
        continue;
      }

      // Get prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 100,
      });

      if (prices.data.length === 0) {
        console.log(`⚠️  No prices found for "${productConfig.name}". Run setup-stripe.ts first.`);
        continue;
      }

      // Use the first active price
      const activePrice = prices.data.find(p => p.active) || prices.data[0];
      priceIds[productConfig.tier] = activePrice.id;
      console.log(`✓ Found ${productConfig.tier}: ${activePrice.id}`);
    }

    if (Object.keys(priceIds).length !== 3) {
      console.log('\n⚠️  Not all price IDs found. Running setup-stripe.ts to create them...\n');
      // We'll need to run the setup script
      const { execSync } = require('child_process');
      const output = execSync('npx tsx scripts/setup-stripe.ts', {
        encoding: 'utf-8',
        env: { ...process.env, STRIPE_SECRET_KEY: stripeSecretKey }
      });

      // Extract price IDs from output
      const price24H = output.match(/STRIPE_PRICE_ID_24H=(price_\w+)/);
      const price5D = output.match(/STRIPE_PRICE_ID_5D=(price_\w+)/);
      const price14D = output.match(/STRIPE_PRICE_ID_14D=(price_\w+)/);

      if (price24H) priceIds['24H'] = price24H[1];
      if (price5D) priceIds['5D'] = price5D[1];
      if (price14D) priceIds['14D'] = price14D[1];
    }

    // Update .env.local
    // Remove existing price ID lines
    envContent = envContent.replace(/^STRIPE_PRICE_ID_\w+=.*$/gm, '');
    envContent = envContent.replace(/^#.*Stripe Price ID.*$/gm, '');

    // Add new price IDs
    const priceIdSection = [
      '',
      '# Stripe Price IDs (auto-generated)',
      `STRIPE_PRICE_ID_24H=${priceIds['24H'] || ''}`,
      `STRIPE_PRICE_ID_5D=${priceIds['5D'] || ''}`,
      `STRIPE_PRICE_ID_14D=${priceIds['14D'] || ''}`,
    ].join('\n');

    // Ensure file ends with newline before appending
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += priceIdSection + '\n';

    writeFileSync(envPath, envContent, 'utf-8');

    console.log('\n✅ Successfully updated .env.local with Stripe price IDs!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n1️⃣  Configure Stripe Webhook:');
    console.log('   a) Go to: https://dashboard.stripe.com/webhooks');
    console.log('   b) Click "Add endpoint"');
    console.log('   c) Endpoint URL: https://yourdomain.com/api/stripe/webhook');
    console.log('      (For local testing, use Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook)');
    console.log('   d) Select events to listen to:');
    console.log('      - checkout.session.completed');
    console.log('      - payment_intent.succeeded');
    console.log('      - payment_intent.payment_failed');
    console.log('   e) Copy the "Signing secret" (starts with whsec_)');
    console.log('   f) Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_...');
    console.log('\n2️⃣  Run Supabase SQL Schema:');
    console.log('   a) Go to: Supabase Dashboard > SQL Editor > New Query');
    console.log('   b) Open: scripts/supabase-schema.sql');
    console.log('   c) Copy and paste the entire SQL into the editor');
    console.log('   d) Click "Run" to execute');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Setup complete! Your Stripe price IDs are now in .env.local');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

completeSetup();

