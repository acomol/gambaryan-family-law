"use client";

import { useState } from "react";

export default function StickyBar() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      {/* Left section — Gold bg */}
      <div className="flex-1 bg-[var(--color-mh-gold)] flex items-center gap-3 px-4 lg:px-6 py-3">
        {/* Text */}
        <div className="hidden lg:block shrink-0">
          <p className="font-serif italic text-[var(--color-mh-dark)] text-sm leading-tight">
            Free Consultation
          </p>
          <p className="font-bold text-[var(--color-mh-dark)] text-xs uppercase tracking-wide">
            Never Settle For Less!
          </p>
        </div>

        {/* Mobile: simplified text */}
        <div className="lg:hidden shrink-0">
          <p className="font-bold text-[var(--color-mh-dark)] text-xs uppercase">
            Free Case Review
          </p>
        </div>

        {/* Inputs */}
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 text-xs rounded bg-white/90 text-[var(--color-mh-dark)] placeholder:text-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-dark)]"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 text-xs rounded bg-white/90 text-[var(--color-mh-dark)] placeholder:text-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-dark)]"
          />
          <button className="shrink-0 px-4 py-2 bg-[var(--color-mh-blue)] text-white text-xs font-bold uppercase tracking-wide rounded hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap">
            DO I HAVE A CASE?
          </button>
        </div>
      </div>

      {/* Right section — Blue bg */}
      <div className="flex items-center bg-[var(--color-mh-blue)] px-3 lg:px-5 py-3 gap-1 lg:gap-3">
        {/* Call */}
        <a
          href="tel:2564488523"
          className="flex flex-col items-center justify-center px-2 lg:px-4 py-1 text-white hover:text-white/80 transition-colors"
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wide">CALL</span>
        </a>

        {/* Chat */}
        <button className="flex flex-col items-center justify-center px-2 lg:px-4 py-1 text-white hover:text-white/80 transition-colors cursor-pointer">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wide">CHAT</span>
        </button>

        {/* Email */}
        <a
          href="mailto:info@mhatty.com"
          className="flex flex-col items-center justify-center px-2 lg:px-4 py-1 text-white hover:text-white/80 transition-colors"
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wide">EMAIL</span>
        </a>
      </div>
    </div>
  );
}
