// One Supabase client per page/module graph. Every page module imports this
// singleton instead of creating independent auth refresh and storage listeners.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
