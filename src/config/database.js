import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error("Missing required Supabase environment variables");
}

// Create Supabase client for client-side operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create Supabase admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database connection test
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("users").select("count").limit(1);

    if (error) {
      console.error("❌ Database connection failed:", error.message);
      return false;
    }

    console.log("✅ Database connection successful");
    return true;
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    return false;
  }
};

// Database helper functions
export const dbHelpers = {
  // Generic select function
  async select(table, columns = "*", filters = {}) {
    try {
      let query = supabase.from(table).select(columns);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  // Generic insert function
  async insert(table, data) {
    try {
      const { data: result, error } = await supabase.from(table).insert(data).select();

      if (error) throw error;
      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  // Generic update function
  async update(table, data, filters = {}) {
    try {
      let query = supabase.from(table).update(data);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data: result, error } = await query.select();

      if (error) throw error;
      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  // Generic delete function
  async delete(table, filters = {}) {
    try {
      let query = supabase.from(table);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.delete().eq(key, value);
      });

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },
};

// Export default client
export default supabase;
