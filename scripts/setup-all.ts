// Master setup script - runs Stripe and Supabase setup
// Usage: npx tsx scripts/setup-all.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setupAll() {
  console.log('🚀 Starting complete setup...\n');

  try {
    console.log('1️⃣ Setting up Stripe products and prices...');
    await execAsync('npx tsx scripts/setup-stripe.ts');
    console.log('✓ Stripe setup complete\n');

    console.log('2️⃣ Setting up Supabase schema...');
    console.log('   (Note: You may need to run SQL manually in Supabase Dashboard)');
    await execAsync('npx tsx scripts/setup-supabase.ts');
    console.log('✓ Supabase setup complete\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Manual steps required:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Add Stripe price IDs to .env.local (shown above)');
    console.log('2. Configure Stripe webhook endpoint:');
    console.log('   - URL: https://yourdomain.com/api/stripe/webhook');
    console.log('   - Events: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed');
    console.log('   - Copy webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local');
    console.log('3. If Supabase SQL wasn\'t auto-executed, run scripts/supabase-schema.sql in Supabase SQL Editor');
    console.log('   - Go to: Supabase Dashboard > SQL Editor > New Query');
    console.log('   - Copy/paste contents of scripts/supabase-schema.sql');
    console.log('   - Click "Run"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Setup complete!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupAll();





