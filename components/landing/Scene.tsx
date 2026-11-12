"use client";

import styles from "./scene.module.css";

export function UploadScene() {
  return (
    <svg viewBox="0 0 320 240" className={styles.scene} aria-hidden="true">
      <defs>
        <radialGradient id="uGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.35)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </radialGradient>
        <linearGradient id="uCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="120" r="95" fill="url(#uGlow)" />
      <rect x="115" y="75" width="90" height="110" rx="12" fill="url(#uCard)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <line x1="132" y1="105" x2="188" y2="105" stroke="#f0f4f8" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <line x1="132" y1="125" x2="188" y2="125" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="132" y1="142" x2="170" y2="142" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M150 168 L160 150 L170 168 Z" fill="#ff5c39" />
      <circle cx="205" cy="80" r="8" fill="#ffd95a" />
      <circle cx="115" cy="165" r="6" fill="#2dd4bf" />
      <path d="M225 140 Q235 130 245 140" fill="none" stroke="#ff5c39" strokeWidth="3" strokeLinecap="round" />
      <path d="M225 150 Q235 140 245 150" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function OutlineScene() {
  return (
    <svg viewBox="0 0 320 240" className={styles.scene} aria-hidden="true">
      <defs>
        <radialGradient id="oGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(45,212,191,0.32)" />
          <stop offset="100%" stopColor="rgba(45,212,191,0)" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="120" r="95" fill="url(#oGlow)" />
      <rect x="100" y="90" width="120" height="18" rx="9" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <path d="M110 99 L118 106 L130 93" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="100" y="120" width="120" height="18" rx="9" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <path d="M110 129 L118 136 L130 123" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="100" y="150" width="88" height="18" rx="9" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <path d="M110 159 L118 166 L130 153" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M210 75 L220 100 L235 95 L225 115 L240 125 L215 125 L210 145 L200 125 L180 125 L195 110 L185 90 L205 95 Z" fill="#ff5c39" />
    </svg>
  );
}

export function SiteScene() {
  return (
    <svg viewBox="0 0 320 240" className={styles.scene} aria-hidden="true">
      <defs>
        <radialGradient id="sGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(59,130,246,0.3)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="120" r="95" fill="url(#sGlow)" />
      <rect x="85" y="70" width="150" height="110" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <circle cx="110" cy="92" r="6" fill="#2dd4bf" />
      <rect x="125" y="88" width="90" height="8" rx="4" fill="#f0f4f8" opacity="0.9" />
      <rect x="100" y="112" width="120" height="20" rx="6" fill="rgba(45,212,191,0.15)" stroke="rgba(45,212,191,0.3)" strokeWidth="1" />
      <rect x="100" y="140" width="120" height="20" rx="6" fill="rgba(255,92,57,0.12)" stroke="rgba(255,92,57,0.25)" strokeWidth="1" />
      <circle cx="115" cy="122" r="5" fill="#2dd4bf" />
      <circle cx="115" cy="150" r="5" fill="#ff5c39" />
    </svg>
  );
}

export function ShareScene() {
  return (
    <svg viewBox="0 0 320 240" className={styles.scene} aria-hidden="true">
      <defs>
        <radialGradient id="shGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(236,72,153,0.3)" />
          <stop offset="100%" stopColor="rgba(236,72,153,0)" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="120" r="95" fill="url(#shGlow)" />
      <circle cx="125" cy="120" r="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <circle cx="195" cy="90" r="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <circle cx="195" cy="150" r="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <line x1="141" y1="112" x2="178" y2="97" stroke="#ff5c39" strokeWidth="3" strokeLinecap="round" />
      <line x1="141" y1="128" x2="178" y2="143" stroke="#ff5c39" strokeWidth="3" strokeLinecap="round" />
      <circle cx="160" cy="175" r="22" fill="#2dd4bf" />
      <path d="M152 175 L168 175 M160 167 L160 183" stroke="#060b14" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
