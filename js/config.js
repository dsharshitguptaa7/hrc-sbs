/**
 * HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
 * Central Supabase Configuration
 * 
 * IMPORTANT SECURITY RULE:
 * NEVER place the Supabase service_role key or database passwords in this file.
 * Only the project URL and the public anon key are safe for frontend use.
 */

const HRC_CONFIG = {
  // Replace these with your live project credentials from Supabase Project Settings -> API
  SUPABASE_URL: window.ENV_SUPABASE_URL || "https://lnppuwifovpxwqcispry.supabase.co",
  SUPABASE_ANON_KEY: window.ENV_SUPABASE_ANON_KEY || "sb_publishable_GbgTwWczPhNsWzKHBs5Fpg_Uhx9lgq4",
  
  // Storage Buckets
  STORAGE_BUCKETS: {
    PUBLIC_ASSETS: 'public-assets',
    RESEARCH_PAPERS: 'research-papers'
  },
  
  // Default values & metadata
  APP_NAME: "Harish-Chandra Research Centre",
  INSTITUTION: "School of Basic Sciences, CSJMU Kanpur × IIT Kanpur"
};

// Freeze configuration to prevent tampering at runtime
Object.freeze(HRC_CONFIG);
