"use client";

import styles from "./scene.module.css";

export function UploadScene() {
  return (
    <svg viewBox="0 0 320 240" className={styles.scene} aria-hidden="true">
      <defs>
        <linearGradient id="uGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0faf3" />
          <stop offset="100%" stopColor="#dff3e8" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="120" r="95" fill="url(#uGrad)" />
      <rect x="115" y="75" width="90" height="110" rx="10" fill="#fff" stroke="#c9e4d2" strokeWidth="2" />
      <line x1="132" y1="105" x2="188" y2="105" stroke="#99b8a6" strokeWidth="4" strokeLinecap="round" />
      <line x1="132" y1="125" x2="188" y2="125" stroke="#c9e4d2" strokeWidth="3" strokeLinecap="round" />
      <line x1="132" y1="142" x2="170" y2="142" stroke="#c9e4d2" strokeWidth="3" strokeLinecap="round" />
      <path d="M150 168 L160 150 L170 168 Z" fill="#ff8c5a" />
      <circle cx="205" cy="80" r="8" fill="#ffd95a" />
      <circle cx="115" cy="165" r="6" fill="#2d9e6f" />
      <path d="M225 140 Q235 130 245 140" fill="none" stroke="#ff8c5a" strokeWidth="3" strokeLinecap="round" />
      <path d="M225 150 Q235 140 245 150" fill="none" stroke="#2d9e6f" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function OutlineScene() {
  return (
    <svg viewBox="0 0 320 240" className={styles.scene} aria-hidden="true">
      <defs>
        <linearGradient id="oGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff7ea" />
          <stop offset="100%" stopColor="#ffe8c9" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="120" r="95" fill="url(#oGrad)" />
      <rect x="100" y="90" width="120" height="18" rx="9" fill="#fff" stroke="#f1c79a" strokeWidth="2" />
      <path d="M110 99 L118 106 L130 93" fill="none" stroke="#2d9e6f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="100" y="120" width="120" height="18" rx="9" fill="#fff" stroke="#f1c79a" strokeWidth="2" />
      <path d="M110 129 L118 136 L130 123" fill="none" stroke="#2d9e6f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="100" y="150" width="88" height="18" rx="9" fill="#fff" stroke="#f1c79a" strokeWidth="2" />
      <path d="M110 159 L118 166 L130 153" fill="none" stroke="#2d9e6f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M210 75 L220 100 L235 95 L225 115 L240 125 L215 125 L210 145 L200 125 L180 125 L195 110 L185 90 L205 95 Z" fill="#ff8c5a" />
    </svg>
  );
}

export function SiteScene() {
  return (
    <svg viewBox="0 0 320 240" className={styles.scene} aria-hidden="true">
      <defs>
        <linearGradient id="sGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8f6f6" />
          <stop offset="100%" stopColor="#d0edec" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="120" r="95" fill="url(#sGrad)" />
      <rect x="85" y="70" width="150" height="110" rx="12" fill="#fff" stroke="#b8deda" strokeWidth="2" />
      <circle cx="110" cy="92" r="6" fill="#2d9e6f" />
      <rect x="125" y="88" width="90" height="8" rx="4" fill="#0f2922" />
      <rect x="100" y="112" width="120" height="20" rx="6" fill="#dff3e8" />
      <rect x="100" y="140" width="120" height="20" rx="6" fill="#fff7ea" />
      <circle cx="115" cy="122" r="5" fill="#2d9e6f" />
      <circle cx="115" cy="150" r="5" fill="#ff8c5a" />
    </svg>
  );
}

export function ShareScene() {
  return (
    <svg viewBox="0 0 320 240" className={styles.scene} aria-hidden="true">
      <defs>
        <linearGradient id="shGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8edff" />
          <stop offset="100%" stopColor="#ecd7ff" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="120" r="95" fill="url(#shGrad)" />
      <circle cx="125" cy="120" r="18" fill="#fff" stroke="#d4b8e8" strokeWidth="2" />
      <circle cx="195" cy="90" r="18" fill="#fff" stroke="#d4b8e8" strokeWidth="2" />
      <circle cx="195" cy="150" r="18" fill="#fff" stroke="#d4b8e8" strokeWidth="2" />
      <line x1="141" y1="112" x2="178" y2="97" stroke="#ff8c5a" strokeWidth="3" strokeLinecap="round" />
      <line x1="141" y1="128" x2="178" y2="143" stroke="#ff8c5a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="160" cy="175" r="22" fill="#2d9e6f" />
      <path d="M152 175 L168 175 M160 167 L160 183" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
