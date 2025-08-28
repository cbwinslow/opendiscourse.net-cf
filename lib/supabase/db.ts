import { supabase, Tables } from '../../config/supabase';

// Generic function to fetch all rows from a table
export async function fetchAllFromTable<T extends keyof Tables>(
  table: T
): Promise<Tables[T]['Row'][]> {
  const { data, error } = await supabase.from(table).select('*');
  
  if (error) {
    console.error(`Error fetching from ${table}:`, error);
    throw error;
  }
  
  return data || [];
}

// Generic function to fetch a single row by ID
export async function fetchById<T extends keyof Tables>(
  table: T,
  id: string
): Promise<Tables[T]['Row'] | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
    console.error(`Error fetching from ${table} with id ${id}:`, error);
    throw error;
  }
  
  return data;
}

// Generic function to insert a new row
export async function insertRow<T extends keyof Tables>(
  table: T,
  row: Tables[T]['Insert']
): Promise<Tables[T]['Row']> {
  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select()
    .single();
    
  if (error) {
    console.error(`Error inserting into ${table}:`, error);
    throw error;
  }
  
  return data;
}

// Generic function to update a row
export async function updateRow<T extends keyof Tables>(
  table: T,
  id: string,
  updates: Tables[T]['Update']
): Promise<Tables[T]['Row']> {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error(`Error updating ${table} with id ${id}:`, error);
    throw error;
  }
  
  return data;
}

// Generic function to delete a row
export async function deleteRow<T extends keyof Tables>(
  table: T,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error(`Error deleting from ${table} with id ${id}:`, error);
    throw error;
  }
}

// Function to initialize the database schema
export async function initializeDatabase() {
  // Check if the documents table exists, create if it doesn't
  const { data: tables } = await supabase.rpc('get_schema');
  
  if (!tables?.includes('documents')) {
    await supabase.rpc(`
      create table if not exists documents (
        id uuid default gen_random_uuid() primary key,
        title text not null,
        content text not null,
        created_at timestamp with time zone default timezone('utc'::text, now()) not null,
        updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
        metadata jsonb default '{}'::jsonb
      );
    `);
    
    // Create indexes
    await supabase.rpc('create index if not exists documents_title_idx on documents(title)');
    await supabase.rpc('create index if not exists documents_created_at_idx on documents(created_at)');
    await supabase.rpc('create index if not exists documents_metadata_idx on documents using gin(metadata)');
    
    console.log('Database schema initialized');
  }
}
