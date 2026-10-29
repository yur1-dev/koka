"use client";

import Script from "next/script";

/**
 * Loads Vercel Web Analytics in production. Enable it once in the Vercel
 * dashboard (project, Analytics tab) and page views start showing up.
 */
export function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script id="va-init" strategy="afterInteractive">
        {`window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`}
      </Script>
      <Script
        src="/_vercel/insights/script.js"
        strategy="afterInteractive"
        data-sdkn="@vercel/analytics/next"
        data-sdkv="1.5.0"
      />
    </>
  );
}
