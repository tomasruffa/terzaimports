"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "@/lib/firebase";

export default function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const pagePath =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    getFirebaseAnalytics().then((analytics) => {
      if (!analytics) return;
      logEvent(analytics, "page_view", { page_path: pagePath });
    });
  }, [pathname, searchParams]);

  return null;
}
