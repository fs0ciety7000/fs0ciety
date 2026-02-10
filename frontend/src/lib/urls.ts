/**
 * Subdomain-aware URL builder for fs0ciety.org.
 *
 * When navigating across subdomains (e.g. from blog.fs0ciety.org to
 * dash.fs0ciety.org), relative paths get rewritten by the middleware
 * and break.  This helper builds absolute URLs so cross-subdomain
 * links always land on the correct host.
 */

import { useState, useEffect } from "react";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";

/** Map of internal path prefixes → subdomain labels. */
const PATH_TO_SUBDOMAIN: Record<string, string> = {
  "/blog": "blog",
  "/dashboard": "dash",
};

/** Inverse: subdomain → path prefix (used for "same-subdomain" detection). */
const SUBDOMAIN_TO_PATH: Record<string, string> = {
  blog: "/blog",
  dash: "/dashboard",
};

/**
 * Build the correct href for a given internal path.
 * Must only be called client-side (after mount).
 */
function computeSubdomainHref(path: string): string {
  const proto = window.location.protocol;
  const currentHost = window.location.hostname;
  const domainBase = DOMAIN.split(":")[0];

  // Detect which subdomain we're currently on (empty string = root)
  let currentSub = "";
  if (
    currentHost !== domainBase &&
    currentHost.endsWith(`.${domainBase}`)
  ) {
    currentSub = currentHost.slice(0, currentHost.length - domainBase.length - 1);
  }

  // Determine the target subdomain for the given path
  let targetSub = ""; // root
  for (const [prefix, sub] of Object.entries(PATH_TO_SUBDOMAIN)) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      targetSub = sub;
      break;
    }
  }

  // Same subdomain → relative is fine
  if (targetSub === currentSub) return path;

  // Going to root domain
  if (targetSub === "") {
    return `${proto}//${domainBase}${path}`;
  }

  // Going to a different subdomain — strip the path prefix since the
  // middleware will re-add it via rewrite.
  const prefix = SUBDOMAIN_TO_PATH[targetSub] || "";
  const stripped = path.startsWith(prefix) ? path.slice(prefix.length) || "/" : path;
  return `${proto}//${targetSub}.${domainBase}${stripped}`;
}

/**
 * React hook that returns subdomain-aware URLs.
 * On SSR it returns the raw paths; after hydration it computes full URLs.
 */
export function useSubdomainHrefs<T extends Record<string, string>>(paths: T): T {
  const [hrefs, setHrefs] = useState<T>(paths);

  useEffect(() => {
    const resolved = {} as Record<string, string>;
    for (const [key, path] of Object.entries(paths)) {
      resolved[key] = computeSubdomainHref(path);
    }
    setHrefs(resolved as T);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return hrefs;
}
