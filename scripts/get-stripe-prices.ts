// Helper script to get Stripe price IDs and update .env.local
// Usage: npx tsx scripts/get-stripe-prices.ts

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

async function getStripePrices() {
  const envPath = join(process.cwd(), '.env.local');
  
  // Load existing .env.local
  let envContent = '';
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  }

  // Check if STRIPE_SECRET_KEY is set
  const stripeKeyMatch = envContent.match(/^STRIPE_SECRET_KEY=(.+)$/m);
  if (!stripeKeyMatch) {
    console.log('❌ STRIPE_SECRET_KEY not found in .env.local');
    console.log('\n📋 Please add your Stripe secret key to .env.local:');
    console.log('   STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)');
    console.log('\n   Get it from: https://dashboard.stripe.com/apikeys');
    process.exit(1);
  }

  // Set the environment variable for the setup script
  process.env.STRIPE_SECRET_KEY = stripeKeyMatch[1].trim();

  // Import and run the setup function
  const { execSync } = require('child_process');
  
  try {
    console.log('🚀 Running Stripe setup to get price IDs...\n');
    const output = execSync('npx tsx scripts/setup-stripe.ts', {
      encoding: 'utf-8',
      env: { ...process.env, STRIPE_SECRET_KEY: stripeKeyMatch[1].trim() }
    });

    // Extract price IDs from output
    const price24H = output.match(/STRIPE_PRICE_ID_24H=(price_\w+)/);
    const price5D = output.match(/STRIPE_PRICE_ID_5D=(price_\w+)/);
    const price14D = output.match(/STRIPE_PRICE_ID_14D=(price_\w+)/);

    if (!price24H || !price5D || !price14D) {
      console.log('⚠️  Could not extract all price IDs from output');
      console.log('\n📋 Please manually add the price IDs shown above to .env.local');
      process.exit(1);
    }

    // Update .env.local
    const priceIds = {
      '24H': price24H[1],
      '5D': price5D[1],
      '14D': price14D[1],
    };

    // Remove existing price ID lines if they exist
    envContent = envContent.replace(/^STRIPE_PRICE_ID_\w+=.*$/gm, '');

    // Add new price IDs
    const priceIdLines = [
      '',
      '# Stripe Price IDs (auto-generated)',
      `STRIPE_PRICE_ID_24H=${priceIds['24H']}`,
      `STRIPE_PRICE_ID_5D=${priceIds['5D']}`,
      `STRIPE_PRICE_ID_14D=${priceIds['14D']}`,
    ].join('\n');

    // Append if file doesn't end with newline
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += priceIdLines + '\n';

    writeFileSync(envPath, envContent, 'utf-8');

    console.log('\n✅ Successfully updated .env.local with Stripe price IDs:');
    console.log(`   STRIPE_PRICE_ID_24H=${priceIds['24H']}`);
    console.log(`   STRIPE_PRICE_ID_5D=${priceIds['5D']}`);
    console.log(`   STRIPE_PRICE_ID_14D=${priceIds['14D']}`);
    console.log('\n📋 Next steps:');
    console.log('   1. Configure Stripe webhook (see instructions below)');
    console.log('   2. Run Supabase SQL schema (see scripts/supabase-schema.sql)');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stdout) {
      console.log('\nOutput:', error.stdout);
    }
    process.exit(1);
  }
}

getStripePrices();





