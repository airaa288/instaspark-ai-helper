const { createClient } = require('@supabase/supabase-js');

const url = 'https://gedmfwakfluakwgyntjc.supabase.co';
const key = 'sb_publishable_AYCEp_2mW6O7rdV8kgOzEA_KMZ5rX3g';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('content_posts').select('*');
  console.log('Data:', data);
  console.log('Error code:', error?.code, 'Error message:', error?.message);
}

test();
