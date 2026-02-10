// Script to automatically create Stripe products and prices
// Usage: npx tsx scripts/setup-stripe.ts

import Stripe from 'stripe';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local (or .env as fallback)
const envPath = resolve(process.cwd(), '.env.local');
const result = config({ path: envPath });
if (result.error) {
  config({ path: resolve(process.cwd(), '.env') });
}

const PRODUCTS = [
  {
    name: '2-Day Access',
    description: 'Perfect for urgent applications - unlimited resumes for 2 days',
    price: 4.95,
    tier: '2D',
  },
  {
    name: '1-Week Access',
    description: 'Tailor unlimited resumes for a full week',
    price: 10.00,
    tier: '7D',
  },
  {
    name: '1-Month Access',
    description: 'Comprehensive access for your full job search',
    price: 20.00,
    tier: '30D',
  },
];

async function setupStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set. Make sure .env.local exists and contains STRIPE_SECRET_KEY.');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });

  const priceIds: Record<string, string> = {};

  console.log('🚀 Setting up Stripe products and prices...\n');

  for (const product of PRODUCTS) {
    // Create or get product
    let stripeProduct;
    const existingProducts = await stripe.products.list({ limit: 100 });
    const existing = existingProducts.data.find(p => p.name === product.name);

    if (existing) {
      stripeProduct = existing;
      console.log(`✓ Product "${product.name}" already exists`);
    } else {
      stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
      });
      console.log(`✓ Created product: "${product.name}"`);
    }

    // Create or get price
    const existingPrices = await stripe.prices.list({
      product: stripeProduct.id,
      limit: 100,
    });
    const existingPrice = existingPrices.data.find(
      p => p.unit_amount === Math.round(product.price * 100)
    );

    if (existingPrice) {
      priceIds[product.tier] = existingPrice.id;
      console.log(`✓ Price for "${product.name}" already exists: ${existingPrice.id}`);
    } else {
      const price = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(product.price * 100),
        currency: 'usd',
      });
      priceIds[product.tier] = price.id;
      console.log(`✓ Created price for "${product.name}": ${price.id}`);
    }
  }

  // Output environment variables
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Add these to your .env.local file:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`STRIPE_PRICE_ID_2D=${priceIds['2D']}`);
  console.log(`STRIPE_PRICE_ID_7D=${priceIds['7D']}`);
  console.log(`STRIPE_PRICE_ID_30D=${priceIds['30D']}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Stripe setup complete!');
}

setupStripe().catch(console.error);

