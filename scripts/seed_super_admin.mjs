import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = process.argv[2] || 'admin@gstbro.com';
  const password = process.argv[3] || 'Admin@123456';
  const name = process.argv[4] || 'Super Admin';

  console.log(`Creating/updating admin user: ${email}...`);
  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        email: email.toLowerCase().trim(),
        name,
        role: 'ADMIN',
        password_hash: passwordHash,
        email_verified: true,
        mobile_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select('id, email, name, role')
    .single();

  if (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }

  console.log('✅ Admin user ready!');
  console.log('Credentials:');
  console.log(`  Email:    ${data.email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     ${data.role}`);
}

main();
