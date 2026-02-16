import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only allow updating these specific keys
const ALLOWED_KEYS = [
  "HUGGINGFACE_API_KEY",
  "TAVILY_API_KEY",
  "RESEND_API_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Must be super_admin to update keys
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only super admins can update API keys" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { key, value } = await req.json();

    if (!key || !value) {
      return new Response(JSON.stringify({ error: "Key and value are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_KEYS.includes(key)) {
      return new Response(JSON.stringify({ error: "This key cannot be updated via the admin panel" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Note: Edge functions cannot update their own secrets at runtime.
    // This stores the request for manual processing or uses the Supabase Management API.
    // For now, we'll log it and inform the admin.
    console.log(`API key update requested by ${user.email}: ${key}`);

    // Store the update request in a table for tracking
    // Since we can't directly update Deno.env secrets from within an edge function,
    // we inform the admin this needs to be done via the platform.
    return new Response(
      JSON.stringify({
        success: false,
        message: `API keys must be updated through the Lovable Cloud secrets manager. Go to Settings → Cloud → Secrets to update ${key}.`,
        key,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update API key error:", error);
    return new Response(JSON.stringify({ error: "Failed to update API key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
