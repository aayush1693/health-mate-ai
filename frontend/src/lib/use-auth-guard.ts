"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuthGuard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const hasUser = Boolean(localStorage.getItem("user"));
      const hasToken = Boolean(localStorage.getItem("token"));
      const hasSession = hasUser && hasToken;

      if (!hasSession) {
        setIsAuthorized(false);
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("focus", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("focus", checkAuth);
    };
  }, [router]);

  return isAuthorized;
}
