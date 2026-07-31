"use client";

import { useLayoutEffect } from "react";

/**
 * Landing loads (and hard refreshes) should always start at the top,
 * ignoring browser scroll restoration and URL hashes.
 */
export default function LandingScrollToTop() {
  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";

    if (window.location.hash) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    window.scrollTo(0, 0);

    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  return null;
}
