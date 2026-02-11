"use client";

import { useState } from "react";
import Link from "next/link";

const PGP_PUBLIC_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Comment: https://keybase.io/download
Version: Keybase Go 6.5.1 (linux)

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
nAjDCsEdfrm+EsFrzPS2I0MxDLw+eg==
=dUnb
-----END PGP PUBLIC KEY BLOCK-----`;

const KEY_FINGERPRINT = "6145 0220 51E0 CB3E";
const KEY_UID = "phant0mhex <phant0mhex@proton.me>";

export default function PGPPage() {
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(PGP_PUBLIC_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = PGP_PUBLIC_KEY;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      {/* Back link */}
      <Link
        href="/blog"
        className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green transition-colors inline-block mb-8"
      >
        &larr; cd /blog
      </Link>

      <h1 className="text-2xl sm:text-3xl font-mono font-bold text-terminal-green mb-3">
        /etc/security
      </h1>
      <p className="text-sm text-[#a3a3a3] font-sans mb-10">
        PGP public key, verification info, and warrant canary.
      </p>

      {/* ── PGP Key Block ─────────────────────────────────── */}
      <section className="mb-10">
        <div className="border border-terminal-green/20 bg-terminal-black-light">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-green/10">
            <div className="flex items-center gap-3">
              <span className="text-terminal-amber font-mono text-sm font-bold">#</span>
              <span className="text-terminal-green font-mono text-sm font-bold uppercase tracking-wider">
                PGP Public Key
              </span>
            </div>
            <button
              onClick={copyKey}
              className="text-xs font-mono border border-terminal-cyan/30 text-terminal-cyan px-3 py-1 hover:text-terminal-green hover:border-terminal-green/40 transition-colors"
            >
              {copied ? "copied!" : "copy key"}
            </button>
          </div>

          {/* Key metadata */}
          <div className="px-4 py-3 border-b border-terminal-green/10 space-y-2">
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-terminal-green-dim w-24">uid</span>
              <span className="text-terminal-cyan">{KEY_UID}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-terminal-green-dim w-24">fingerprint</span>
              <span className="text-[#d4d4d4]">{KEY_FINGERPRINT}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-terminal-green-dim w-24">algo</span>
              <span className="text-[#d4d4d4]">RSA 4096</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-terminal-green-dim w-24">keybase</span>
              <a
                href="https://keybase.io/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-terminal-cyan hover:text-terminal-green transition-colors"
              >
                keybase.io/download
              </a>
            </div>
          </div>

          {/* Key block */}
          <div className="p-4 overflow-x-auto">
            <pre className="text-[10px] sm:text-xs font-mono text-terminal-green-dim leading-relaxed whitespace-pre select-all">
              {PGP_PUBLIC_KEY}
            </pre>
          </div>
        </div>
      </section>

      {/* ── Verification ──────────────────────────────────── */}
      <section className="mb-10">
        <div className="border border-terminal-green/20 bg-terminal-black-light p-5">
          <h2 className="text-sm font-mono font-bold text-terminal-green uppercase tracking-wider mb-4">
            <span className="text-terminal-amber mr-2">$</span>
            Signature Verification
          </h2>
          <div className="space-y-3 text-xs font-mono text-[#a3a3a3]">
            <p>
              All signed messages and posts from this identity can be verified
              against the public key above.
            </p>
            <div className="bg-terminal-black border border-terminal-gray p-3">
              <div className="text-terminal-green-dim">
                <span className="text-terminal-green">$</span> gpg --import pubkey.asc
              </div>
              <div className="text-terminal-green-dim mt-1">
                <span className="text-terminal-green">$</span> gpg --verify message.sig message.txt
              </div>
            </div>
            <p className="text-terminal-green-dim">
              Verify the fingerprint matches: <span className="text-[#d4d4d4]">{KEY_FINGERPRINT}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Warrant Canary ────────────────────────────────── */}
      <section className="mb-10">
        <div className="border border-terminal-green/20 bg-terminal-black-light p-5">
          <h2 className="text-sm font-mono font-bold text-terminal-green uppercase tracking-wider mb-4">
            <span className="text-terminal-amber mr-2">!</span>
            Warrant Canary
          </h2>
          <div className="space-y-3 text-xs font-mono text-[#a3a3a3]">
            <p>
              As of the date of the last update to this page:
            </p>
            <ul className="space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-terminal-green mt-0.5">[+]</span>
                <span>No National Security Letters have been received.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-green mt-0.5">[+]</span>
                <span>No gag orders have been received.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-green mt-0.5">[+]</span>
                <span>No warrants or subpoenas for user data have been received.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-green mt-0.5">[+]</span>
                <span>No searches or seizures of any kind have been performed on infrastructure.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-green mt-0.5">[+]</span>
                <span>No backdoors have been planted in software or infrastructure.</span>
              </li>
            </ul>
            <div className="border-t border-terminal-gray-light pt-3 mt-4 text-terminal-green-dim">
              <p>
                If this canary disappears or is not updated, assume the worst.
              </p>
              <p className="mt-1 text-[#d4d4d4]">
                Last updated: {new Date().toISOString().split("T")[0]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── OPSEC Recommendations ─────────────────────────── */}
      <section className="mb-10">
        <div className="border border-terminal-green/20 bg-terminal-black-light p-5">
          <h2 className="text-sm font-mono font-bold text-terminal-green uppercase tracking-wider mb-4">
            <span className="text-terminal-amber mr-2">~</span>
            Contact &amp; OPSEC
          </h2>
          <div className="space-y-3 text-xs font-mono text-[#a3a3a3]">
            <p>For secure communication:</p>
            <ul className="space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-terminal-cyan">-&gt;</span>
                <span>
                  Encrypt messages with the PGP key above before sending to{" "}
                  <span className="text-terminal-cyan">{KEY_UID.split("<")[1]?.replace(">", "")}</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-cyan">-&gt;</span>
                <span>
                  Use Tor or a trusted VPN when accessing this site for anonymity.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-cyan">-&gt;</span>
                <span>
                  Do not include personal metadata in encrypted messages.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-cyan">-&gt;</span>
                <span>
                  Verify the key fingerprint through an independent channel.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
