// Comprehensive payment flow test
// Usage: npx tsx scripts/test-payment-flow.ts

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
function loadEnv() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    throw new Error('.env.local not found');
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });

  return envVars;
}

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];
const envVars = loadEnv();

const stripe = new Stripe(envVars.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL || '',
  envVars.SUPABASE_SECRET_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Test 1: Verify Stripe connection
async function testStripeConnection() {
  try {
    const account = await stripe.accounts.retrieve();
    results.push({
      test: 'Stripe Connection',
      passed: true,
      details: {
        accountId: account.id,
        email: account.email,
      },
    });
    console.log('✅ Stripe connection successful');
    return true;
  } catch (error) {
    results.push({
      test: 'Stripe Connection',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ Stripe connection failed');
    return false;
  }
}

// Test 2: Verify Price IDs exist
async function testPriceIds() {
  const priceIds = {
    '24H': envVars.STRIPE_PRICE_ID_24H,
    '5D': envVars.STRIPE_PRICE_ID_5D,
    '14D': envVars.STRIPE_PRICE_ID_14D,
  };

  const missing: string[] = [];
  const found: string[] = [];

  for (const [tier, priceId] of Object.entries(priceIds)) {
    if (!priceId) {
      missing.push(tier);
      continue;
    }

    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price && price.active) {
        found.push(tier);
        console.log(`✅ Price ID for ${tier}: ${priceId} ($${(price.unit_amount || 0) / 100})`);
      } else {
        missing.push(tier);
        console.log(`❌ Price ID for ${tier} exists but is inactive`);
      }
    } catch (error) {
      missing.push(tier);
      console.log(`❌ Price ID for ${tier} not found: ${priceId}`);
    }
  }

  results.push({
    test: 'Price IDs Verification',
    passed: missing.length === 0,
    details: {
      found,
      missing,
      total: Object.keys(priceIds).length,
    },
  });

  return missing.length === 0;
}

// Test 3: Create test checkout session
async function testCheckoutSessionCreation() {
  try {
    const priceId = envVars.STRIPE_PRICE_ID_24H;
    if (!priceId) {
      throw new Error('STRIPE_PRICE_ID_24H not set');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        tier: '24H',
        test: 'true',
      },
    });

    if (session && session.id) {
      results.push({
        test: 'Checkout Session Creation',
        passed: true,
        details: {
          sessionId: session.id,
          url: session.url,
          paymentStatus: session.payment_status,
        },
      });
      console.log(`✅ Checkout session created: ${session.id}`);
      return session.id;
    } else {
      throw new Error('Invalid session response');
    }
  } catch (error) {
    results.push({
      test: 'Checkout Session Creation',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ Checkout session creation failed');
    return null;
  }
}

// Test 4: Verify Supabase tables
async function testSupabaseTables() {
  const tables = ['access_grants', 'resumes', 'sessions', 'payments'];
  const found: string[] = [];
  const missing: string[] = [];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && error.code === 'PGRST116') {
        missing.push(table);
      } else {
        found.push(table);
        console.log(`✅ Table ${table} exists`);
      }
    } catch (error) {
      missing.push(table);
      console.log(`❌ Table ${table} not found`);
    }
  }

  results.push({
    test: 'Supabase Tables',
    passed: missing.length === 0,
    details: {
      found,
      missing,
    },
  });

  return missing.length === 0;
}

// Test 5: Test Supabase user creation (simulated)
async function testSupabaseUserCreation() {
  try {
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Try to create a user via admin API
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    if (user && user.user) {
      // Clean up test user
      await supabase.auth.admin.deleteUser(user.user.id);
      
      results.push({
        test: 'Supabase User Creation',
        passed: true,
        details: {
          userId: user.user.id,
        },
      });
      console.log('✅ Supabase user creation works');
      return true;
    } else {
      throw new Error('User creation returned invalid response');
    }
  } catch (error) {
    results.push({
      test: 'Supabase User Creation',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ Supabase user creation failed');
    return false;
  }
}

// Test 6: Test access grant creation
async function testAccessGrantCreation() {
  try {
    // Create a test user first
    const testEmail = `test-grant-${Date.now()}@example.com`;
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
    });

    if (userError || !user?.user) {
      throw new Error('Failed to create test user');
    }

    const userId = user.user.id;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create access grant
    const { data: grant, error: grantError } = await supabase
      .from('access_grants')
      .insert({
        user_id: userId,
        stripe_session_id: `test_session_${Date.now()}`,
        payment_timestamp: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        tier_purchased: '24H',
        is_active: true,
      })
      .select()
      .single();

    if (grantError) {
      // Clean up user
      await supabase.auth.admin.deleteUser(userId);
      throw grantError;
    }

    // Verify grant was created
    const { data: verifyGrant } = await supabase
      .from('access_grants')
      .select('*')
      .eq('id', grant.id)
      .single();

    // Clean up
    await supabase.from('access_grants').delete().eq('id', grant.id);
    await supabase.auth.admin.deleteUser(userId);

    if (verifyGrant) {
      results.push({
        test: 'Access Grant Creation',
        passed: true,
        details: {
          grantId: grant.id,
          tier: grant.tier_purchased,
        },
      });
      console.log('✅ Access grant creation works');
      return true;
    } else {
      throw new Error('Grant not found after creation');
    }
  } catch (error) {
    results.push({
      test: 'Access Grant Creation',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ Access grant creation failed');
    return false;
  }
}

// Test 7: Test payment record creation
async function testPaymentRecordCreation() {
  try {
    const testEmail = `test-payment-${Date.now()}@example.com`;
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
    });

    if (userError || !user?.user) {
      throw new Error('Failed to create test user');
    }

    const userId = user.user.id;
    const sessionId = `test_session_${Date.now()}`;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        stripe_session_id: sessionId,
        stripe_price_id: envVars.STRIPE_PRICE_ID_24H || 'test_price',
        amount_cents: 495,
        currency: 'usd',
        status: 'completed',
        tier_purchased: '24H',
      })
      .select()
      .single();

    if (paymentError) {
      await supabase.auth.admin.deleteUser(userId);
      throw paymentError;
    }

    // Clean up
    await supabase.from('payments').delete().eq('id', payment.id);
    await supabase.auth.admin.deleteUser(userId);

    results.push({
      test: 'Payment Record Creation',
      passed: true,
      details: {
        paymentId: payment.id,
        amount: payment.amount_cents,
      },
    });
    console.log('✅ Payment record creation works');
    return true;
  } catch (error) {
    results.push({
      test: 'Payment Record Creation',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ Payment record creation failed');
    return false;
  }
}

// Test 8: Verify webhook secret is set
async function testWebhookSecret() {
  const webhookSecret = envVars.STRIPE_WEBHOOK_SECRET;
  const hasSecret = webhookSecret && webhookSecret.startsWith('whsec_');

  results.push({
    test: 'Webhook Secret Configuration',
    passed: !!hasSecret,
    details: {
      isSet: !!webhookSecret,
      isValidFormat: !!hasSecret,
    },
  });

  if (hasSecret) {
    console.log('✅ Webhook secret is configured');
  } else {
    console.log('❌ Webhook secret is missing or invalid');
  }

  return hasSecret;
}

// Test 9: Test SQL functions
async function testSQLFunctions() {
  try {
    const testEmail = `test-func-${Date.now()}@example.com`;
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
    });

    if (userError || !user?.user) {
      throw new Error('Failed to create test user');
    }

    const userId = user.user.id;

    // Test has_active_access function
    const { data: hasAccess, error: accessError } = await supabase.rpc('has_active_access', {
      user_uuid: userId,
    });

    // Test get_current_tier function
    const { data: tier, error: tierError } = await supabase.rpc('get_current_tier', {
      user_uuid: userId,
    });

    // Clean up
    await supabase.auth.admin.deleteUser(userId);

    if (accessError || tierError) {
      throw new Error('Function call failed');
    }

    results.push({
      test: 'SQL Functions',
      passed: true,
      details: {
        hasActiveAccess: hasAccess,
        currentTier: tier,
      },
    });
    console.log('✅ SQL functions work correctly');
    return true;
  } catch (error) {
    results.push({
      test: 'SQL Functions',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ SQL functions test failed');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Comprehensive Payment Flow Test Suite\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Run tests
  await testStripeConnection();
  await testPriceIds();
  await testWebhookSecret();
  await testSupabaseTables();
  await testSupabaseUserCreation();
  await testAccessGrantCreation();
  await testPaymentRecordCreation();
  await testSQLFunctions();
  const sessionId = await testCheckoutSessionCreation();

  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details && Object.keys(result.details).length > 0) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });

  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED! Your payment flow is ready.\n');
    console.log('📋 Next Steps:');
    console.log('   1. Start your Next.js app: npm run dev');
    console.log('   2. Keep Stripe webhook listener running: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('   3. Test with Stripe test card: 4242 4242 4242 4242');
  } else {
    console.log('❌ SOME TESTS FAILED. Please review the errors above.\n');
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});

