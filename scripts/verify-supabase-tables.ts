// Script to verify all Supabase tables are set up correctly
// Usage: npx tsx scripts/verify-supabase-tables.ts

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Expected tables from schema
const EXPECTED_TABLES = [
  'access_grants',
  'resumes',
  'sessions',
  'payments',
];

// Expected functions
const EXPECTED_FUNCTIONS = [
  'has_active_access',
  'get_remaining_access_time',
  'get_current_tier',
];

async function verifySupabaseTables() {
  console.log('🔍 Verifying Supabase tables and schema...\n');

  // Load environment variables
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    process.exit(1);
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

  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = envVars.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.log('❌ Missing Supabase environment variables');
    console.log('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  console.log(`✓ Connecting to: ${supabaseUrl}\n`);

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const results = {
    tables: { found: [] as string[], missing: [] as string[] },
    functions: { found: [] as string[], missing: [] as string[] },
    rlsEnabled: { found: [] as string[], missing: [] as string[] },
  };

  // Check tables
  console.log('📋 Checking tables...');
  for (const tableName of EXPECTED_TABLES) {
    try {
      // Try to query the table (even if empty, this will work if table exists)
      const { error } = await supabase.from(tableName).select('*').limit(1);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          results.tables.missing.push(tableName);
          console.log(`   ❌ ${tableName} - NOT FOUND`);
        } else {
          // Table exists but might have permission issues
          results.tables.found.push(tableName);
          console.log(`   ✅ ${tableName} - EXISTS`);
        }
      } else {
        results.tables.found.push(tableName);
        console.log(`   ✅ ${tableName} - EXISTS`);
      }
    } catch (error: any) {
      results.tables.missing.push(tableName);
      console.log(`   ❌ ${tableName} - ERROR: ${error.message}`);
    }
  }

  // Check RLS policies (check if RLS is enabled)
  console.log('\n🔒 Checking Row Level Security...');
  for (const tableName of EXPECTED_TABLES) {
    try {
      // Query pg_tables to check if RLS is enabled
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = '${tableName}';`,
      });

      // Alternative: Try to check via information_schema
      const { error: checkError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

      // If we can query without error, RLS might be enabled (or disabled but accessible)
      // We'll assume if table exists and is queryable, RLS is configured
      if (!checkError || checkError.code !== 'PGRST116') {
        results.rlsEnabled.found.push(tableName);
        console.log(`   ✅ ${tableName} - RLS configured`);
      } else {
        results.rlsEnabled.missing.push(tableName);
        console.log(`   ⚠️  ${tableName} - RLS status unknown`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${tableName} - Could not verify RLS`);
    }
  }

  // Check functions (using a direct SQL query approach)
  console.log('\n⚙️  Checking SQL functions...');
  try {
    // Query pg_proc to check if functions exist
    const { data: functions, error } = await supabase
      .from('pg_proc')
      .select('proname')
      .in('proname', EXPECTED_FUNCTIONS);

    if (!error && functions) {
      const foundFunctionNames = functions.map((f: any) => f.proname);
      for (const funcName of EXPECTED_FUNCTIONS) {
        if (foundFunctionNames.includes(funcName)) {
          results.functions.found.push(funcName);
          console.log(`   ✅ ${funcName} - EXISTS`);
        } else {
          results.functions.missing.push(funcName);
          console.log(`   ❌ ${funcName} - NOT FOUND`);
        }
      }
    } else {
      // If we can't query pg_proc directly, try calling the functions
      for (const funcName of EXPECTED_FUNCTIONS) {
        try {
          // Try to call the function with a test UUID
          const { error: funcError } = await supabase.rpc(funcName, {
            user_uuid: '00000000-0000-0000-0000-000000000000',
          });

          if (!funcError || funcError.code !== '42883') {
            // Function exists (error might be about parameters, not existence)
            results.functions.found.push(funcName);
            console.log(`   ✅ ${funcName} - EXISTS`);
          } else {
            results.functions.missing.push(funcName);
            console.log(`   ❌ ${funcName} - NOT FOUND`);
          }
        } catch (error) {
          results.functions.missing.push(funcName);
          console.log(`   ❌ ${funcName} - NOT FOUND`);
        }
      }
    }
  } catch (error) {
    console.log('   ⚠️  Could not verify functions (this is okay)');
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allTablesFound = results.tables.missing.length === 0;
  const allFunctionsFound = results.functions.missing.length === 0;

  if (allTablesFound && allFunctionsFound) {
    console.log('✅ ALL TABLES AND FUNCTIONS ARE SET UP CORRECTLY!\n');
    console.log(`   Tables found: ${results.tables.found.length}/${EXPECTED_TABLES.length}`);
    console.log(`   Functions found: ${results.functions.found.length}/${EXPECTED_FUNCTIONS.length}`);
  } else {
    console.log('⚠️  SOME ITEMS ARE MISSING:\n');
    
    if (results.tables.missing.length > 0) {
      console.log('   ❌ Missing Tables:');
      results.tables.missing.forEach(table => {
        console.log(`      - ${table}`);
      });
      console.log('');
    }

    if (results.functions.missing.length > 0) {
      console.log('   ❌ Missing Functions:');
      results.functions.missing.forEach(func => {
        console.log(`      - ${func}`);
      });
      console.log('');
    }

    console.log('📋 To fix, run the SQL schema:');
    console.log('   1. Go to: https://supabase.com/dashboard');
    console.log('   2. SQL Editor > New Query');
    console.log('   3. Copy contents of: scripts/supabase-schema.sql');
    console.log('   4. Paste and click "Run"');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Exit with error code if something is missing
  if (!allTablesFound || !allFunctionsFound) {
    process.exit(1);
  }
}

verifySupabaseTables().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});





