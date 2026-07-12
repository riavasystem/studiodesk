import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function useHydratedAuth() {
  const [hasHydrated, setHasHydrated] = useState(useAuthStore.persist.hasHydrated());
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHasHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHasHydrated(true);
    return unsubscribe;
  }, []);

  return { hasHydrated, isAuthenticated: hasHydrated && !!accessToken };
}
