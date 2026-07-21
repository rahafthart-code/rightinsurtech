import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin(user: User | null) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    let mounted = true;
    setChecking(true);
    supabase
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .then(({ data }) => {
        if (!mounted) return;
        setIsAdmin((data?.length ?? 0) > 0);
        setChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  return { isAdmin, checking };
}
