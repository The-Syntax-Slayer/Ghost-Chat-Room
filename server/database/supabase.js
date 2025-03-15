global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Add error handling for the Supabase URL and anon key
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Error: Supabase URL or Anon Key not found in environment variables');
}

// Create Supabase client with fetch implementation and timeout
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)),
      headers: { 'x-application-name': 'hackers-chat-room' }
    },
    db: {
      schema: 'public'
    }
  }
);

// Test connection function
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error.message);
    return false;
  }
}

// User Management Functions
async function createUser(name, username, hashedPassword) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          username,
          password: hashedPassword
        }
      ])
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating user in Supabase:', error);
    return { success: false, error: error.message };
  }
}

async function getUser(username) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user from Supabase:', error);
    return null;
  }
}

async function isAdminInSupabase(username) {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('username')
      .eq('username', username)
      .single();
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking admin status in Supabase:', error);
    return false;
  }
}

// Message Functions
async function saveMessageToSupabase(username, message) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        username,
        message,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving message to Supabase:', error.message);
    return null;
  }
}

async function getMessagesFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data.reverse();
  } catch (error) {
    console.error('Error getting messages from Supabase:', error.message);
    return [];
  }
}

async function clearMessagesInSupabase() {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .neq('id', 0);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clearing messages in Supabase:', error.message);
    return false;
  }
}

module.exports = {
  createUser,
  getUser,
  isAdminInSupabase,
  saveMessageToSupabase,
  getMessagesFromSupabase,
  clearMessagesInSupabase,
  testSupabaseConnection
}; 