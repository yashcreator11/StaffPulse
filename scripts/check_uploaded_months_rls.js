const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:34322/postgres' });
  await client.connect();
  const res = await client.query("SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'uploaded_months'");
  console.log('Policies on uploaded_months:', JSON.stringify(res.rows, null, 2));
  const rls = await client.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'uploaded_months'");
  console.log('RLS on uploaded_months:', JSON.stringify(rls.rows, null, 2));
  await client.end();
}

main().catch(console.error);
