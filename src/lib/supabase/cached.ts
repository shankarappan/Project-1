import { cache } from "react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

/** Request-scoped cached Supabase client / auth lookups */
export const createClient = cache(async () => createSupabaseClient());

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getAuthUserId = cache(async () => {
  const user = await getAuthUser();
  return user?.id ?? null;
});
