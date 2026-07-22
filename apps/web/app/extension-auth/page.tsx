"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE || "offeros-api";

export default function ExtensionAuthPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    const redirect = new URL(window.location.href).searchParams.get("redirect_uri") || "";
    if (!/^https:\/\/[a-p]{32}\.chromiumapp\.org\/offeros\/?$/.test(redirect)) { setError("The extension callback is invalid."); return; }
    setBusy(true); setError("");
    try { const token = await getToken({ template }); if (!token) throw new Error(); window.location.assign(`${redirect}#token=${encodeURIComponent(token)}`); }
    catch { setError("OfferOS could not authorize the extension. Refresh your session and try again."); setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#151722] px-4 text-slate-100"><section className="w-full max-w-md rounded-xl border border-slate-700/45 bg-[#1b1d2b] p-6"><div className="text-sm font-semibold text-indigo-200">OfferOS</div><h1 className="mt-2 text-2xl font-semibold">Connect Job Capture</h1><p className="mt-3 text-sm leading-6 text-slate-400">Authorize the Chrome extension to use a short-lived token for your OfferOS account. The extension stores it only for the current browser session.</p>{error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}<button className="mt-5 h-10 w-full rounded-lg border border-indigo-400/35 bg-indigo-500/80 font-medium disabled:opacity-50" disabled={!isLoaded || !isSignedIn || busy} onClick={() => void connect()}>{busy ? "Connecting..." : "Connect extension"}</button></section></main>;
}
