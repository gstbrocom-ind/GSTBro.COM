import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'server/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSchemaVerification() {
  console.log('========================================================');
  console.log('   GST Invoice Module — Database Schema Verification    ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Verify users columns
  process.stdout.write('1. Checking users table extensions (pan, bank_details, etc.)... ');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, pan, logo_url, signature_url, bank_details, upi_id, invoice_terms, state_code')
    .limit(1);

  if (userError) {
    console.log('❌ FAILED: ' + userError.message);
    failed++;
  } else {
    console.log('✅ OK');
    passed++;
  }

  // 2. Verify new tables
  const tables = [
    'invoice_items',
    'invoice_customers',
    'invoice_series',
    'invoice_templates',
    'invoices',
    'invoice_line_items',
    'credit_notes',
  ];

  for (const table of tables) {
    process.stdout.write(`2. Checking table '${table}'... `);
    const { error: tblError } = await supabase.from(table).select('*').limit(1);
    if (tblError) {
      console.log('❌ FAILED: ' + tblError.message);
      failed++;
    } else {
      console.log('✅ OK');
      passed++;
    }
  }

  // 3. Verify RPC function: get_financial_year
  process.stdout.write('3. Checking Postgres function: get_financial_year()... ');
  try {
    const { data: fyData, error: fyError } = await supabase.rpc('get_financial_year', {
      p_date: '2026-10-16',
    });
    if (fyError) {
      console.log('❌ FAILED: ' + fyError.message);
      failed++;
    } else {
      console.log(`✅ OK (Output: ${fyData})`);
      passed++;
    }
  } catch (err) {
    console.log('❌ EXCEPTION: ' + err.message);
    failed++;
  }

  // 4. Verify RPC function: check_min_invoice_items
  process.stdout.write('4. Checking Postgres function: check_min_invoice_items()... ');
  try {
    const { data: minItems, error: minError } = await supabase.rpc('check_min_invoice_items', {
      p_vendor_id: '00000000-0000-0000-0000-000000000000',
    });
    if (minError) {
      console.log('❌ FAILED: ' + minError.message);
      failed++;
    } else {
      console.log(`✅ OK (Output: ${minItems})`);
      passed++;
    }
  } catch (err) {
    console.log('❌ EXCEPTION: ' + err.message);
    failed++;
  }

  console.log('\n--------------------------------------------------------');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All invoice schema components are fully verified!');
  } else {
    console.log('⚠️ Please execute the combined migration SQL in Supabase SQL Editor.');
  }
  console.log('--------------------------------------------------------\n');
}

runSchemaVerification();
