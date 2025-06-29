import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";


const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// Replace with your Supabase URL and service role key (for server-side operations)
const supabaseUrl =process.env.SUPABASE_URL;
const supabaseServiceKey =process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initial setup - Create required tables if they don't exist
const setupDatabase = async () => {
  try {
    console.log("Setting up database tables if needed...");

    // This would typically be done through Supabase migrations or the web interface
    // For this example, we're just logging what needs to be created
    
    console.log("Required tables:");
    console.log("- profiles: User profiles with additional info");
    console.log("- rooms: Chat rooms with their details");
    console.log("- messages: Messages sent in rooms");
    console.log("- room_participants: Tracks users in rooms");
    console.log("- reports: Message reports for moderation");
    console.log("- user_blocks: Users blocked by others");

    console.log("Database setup complete!");
  } catch (error) {
    console.error("Error setting up database:", error);
  }
};

// Auth endpoints
app.post("/signup", async (req, res) => {
  const { email, password, username, first_name, last_name } = req.body;

  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        username,
        first_name,
        last_name
      }
    });

    if (authError) throw authError;

    // Create profile in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        first_name,
        last_name,
        created_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    res.status(200).json(authData.user);
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    res.status(200).json(data.user);
  } catch (error) {
    console.error("Error in login:", error);
    res.status(400).json({ error: error.message });
  }
});

// Room management endpoints
app.get("/rooms", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(400).json({ error: error.message });
  }
});

// User search endpoint
app.get("/users/search", async (req, res) => {
  const { query } = req.query;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url')
      .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(400).json({ error: error.message });
  }
});

// Initialize database on startup
setupDatabase();

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});