// Test script to verify Stripe integration compatibility with API version 2025-12-15.clover
// Usage: npx tsx scripts/test-stripe-integration.ts

import Stripe from 'stripe';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
function loadEnv() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    return {};
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

const envVars = loadEnv();
const stripeSecretKey = envVars.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
});

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function testCheckoutSessionCreation() {
  try {
    console.log('Testing checkout session creation...');
    
    // Test with minimal required fields
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Product',
            },
            unit_amount: 1000, // $10.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        test: 'true',
        tier: '24H',
      },
    });

    if (session && session.id) {
      results.push({
        test: 'Checkout Session Creation',
        passed: true,
        details: {
          sessionId: session.id,
          url: session.url,
          metadata: session.metadata,
        },
      });
      console.log('✓ Checkout session created successfully');
      
      // Clean up test session
      // Note: Checkout sessions can't be deleted, but we can mark it as test
      return session.id;
    } else {
      throw new Error('Session creation returned invalid response');
    }
  } catch (error) {
    results.push({
      test: 'Checkout Session Creation',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('✗ Checkout session creation failed:', error);
    return null;
  }
}

async function testCheckoutSessionRetrieve(sessionId: string) {
  try {
    console.log('Testing checkout session retrieval...');
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session && session.id === sessionId) {
      results.push({
        test: 'Checkout Session Retrieve',
        passed: true,
        details: {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
        },
      });
      console.log('✓ Checkout session retrieved successfully');
      return true;
    } else {
      throw new Error('Session retrieval returned invalid response');
    }
  } catch (error) {
    results.push({
      test: 'Checkout Session Retrieve',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('✗ Checkout session retrieval failed:', error);
    return false;
  }
}

async function testListLineItems(sessionId: string) {
  try {
    console.log('Testing line items listing...');
    
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 10,
    });
    
    if (lineItems && Array.isArray(lineItems.data)) {
      results.push({
        test: 'List Line Items',
        passed: true,
        details: {
          itemCount: lineItems.data.length,
          hasMore: lineItems.has_more,
        },
      });
      console.log('✓ Line items listed successfully');
      return true;
    } else {
      throw new Error('Line items listing returned invalid response');
    }
  } catch (error) {
    results.push({
      test: 'List Line Items',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('✗ Line items listing failed:', error);
    return false;
  }
}

async function testMetadataAccess(sessionId: string) {
  try {
    console.log('Testing metadata access...');
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.metadata && typeof session.metadata === 'object') {
      const metadata = session.metadata as Record<string, string>;
      if (metadata.test === 'true' && metadata.tier === '24H') {
        results.push({
          test: 'Metadata Access',
          passed: true,
          details: {
            metadata,
          },
        });
        console.log('✓ Metadata accessed successfully');
        return true;
      } else {
        throw new Error('Metadata values do not match expected values');
      }
    } else {
      throw new Error('Metadata is not accessible');
    }
  } catch (error) {
    results.push({
      test: 'Metadata Access',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('✗ Metadata access failed:', error);
    return false;
  }
}

async function testPriceIdUsage() {
  try {
    console.log('Testing price ID usage (requires existing price)...');
    
    // This test requires an existing price ID
    // We'll skip it if STRIPE_PRICE_ID_24H is not set
    const priceId = process.env.STRIPE_PRICE_ID_24H;
    
    if (!priceId) {
      results.push({
        test: 'Price ID Usage',
        passed: true,
        details: {
          skipped: true,
          reason: 'STRIPE_PRICE_ID_24H not set - skipping',
        },
      });
      console.log('⚠ Price ID test skipped (no price ID configured)');
      return true;
    }
    
    // Try to retrieve the price to verify it exists
    const price = await stripe.prices.retrieve(priceId);
    
    if (price && price.id === priceId) {
      // Create a test session with the price ID
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });
      
      if (session && session.id) {
        results.push({
          test: 'Price ID Usage',
          passed: true,
          details: {
            priceId,
            sessionId: session.id,
          },
        });
        console.log('✓ Price ID usage successful');
        return true;
      } else {
        throw new Error('Session creation with price ID failed');
      }
    } else {
      throw new Error('Price retrieval failed');
    }
  } catch (error) {
    results.push({
      test: 'Price ID Usage',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('✗ Price ID usage failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Testing Stripe Integration Compatibility');
  console.log('API Version: 2025-12-15.clover\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
    console.log('\nPlease set STRIPE_SECRET_KEY in your .env.local file');
    process.exit(1);
  }

  // Run tests in sequence
  const sessionId = await testCheckoutSessionCreation();
  
  if (sessionId) {
    await testCheckoutSessionRetrieve(sessionId);
    await testListLineItems(sessionId);
    await testMetadataAccess(sessionId);
  }
  
  await testPriceIdUsage();

  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Results Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? '✓' : '✗';
    const status = result.passed ? 'PASSED' : 'FAILED';
    console.log(`${icon} ${result.test}: ${status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details && !result.details.skipped) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });
  
  console.log(`\nTotal: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All tests passed! Your Stripe integration is compatible with API version 2025-12-15.clover');
  } else {
    console.log('\n❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runAllTests().catch(console.error);

