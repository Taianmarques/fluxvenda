import React from "react";

// ── ARIA — IA Advisora ──────────────────────────────────────────────────────
export function ARIA({ mood = "neutral", size = 120 }: { mood?: "neutral" | "speaking" | "thinking" | "alert"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.6))" }}>
      {/* Glow ring */}
      <circle cx="50" cy="50" r="46" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="12s" repeatCount="indefinite" />
      </circle>
      {/* Outer ring */}
      <circle cx="50" cy="50" r="40" fill="#1a0533" stroke="#7c3aed" strokeWidth="2" />
      {/* Inner face panel */}
      <rect x="22" y="28" width="56" height="44" rx="10" fill="#0f0225" stroke="#a855f7" strokeWidth="1.5" />
      {/* Scanline */}
      <rect x="22" y="28" width="56" height="44" rx="10" fill="url(#scanlines)" opacity="0.3" />

      {/* Eyes */}
      {mood === "thinking" ? (
        <>
          <rect x="29" y="41" width="16" height="6" rx="3" fill="#a855f7">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <rect x="55" y="41" width="16" height="6" rx="3" fill="#a855f7">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
          </rect>
        </>
      ) : mood === "alert" ? (
        <>
          <polygon points="37,38 44,54 30,54" fill="#ef4444">
            <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite" />
          </polygon>
          <polygon points="63,38 70,54 56,54" fill="#ef4444">
            <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" begin="0.1s" repeatCount="indefinite" />
          </polygon>
        </>
      ) : (
        <>
          <ellipse cx="37" cy="44" rx="8" ry="7" fill="#a855f7" opacity="0.9" />
          <ellipse cx="63" cy="44" rx="8" ry="7" fill="#a855f7" opacity="0.9" />
          <circle cx="37" cy="44" r="3.5" fill="white" />
          <circle cx="63" cy="44" r="3.5" fill="white" />
          <circle cx="38" cy="43" r="1.5" fill="#1a0533" />
          <circle cx="64" cy="43" r="1.5" fill="#1a0533" />
          {/* Pupil glint */}
          <circle cx="39" cy="42" r="0.8" fill="white" opacity="0.8" />
          <circle cx="65" cy="42" r="0.8" fill="white" opacity="0.8" />
        </>
      )}

      {/* Mouth / audio bars */}
      {mood === "speaking" ? (
        <g transform="translate(35,58)">
          {[0,5,10,15,20,25].map((x, i) => (
            <rect key={i} x={x} y="0" width="3.5" height="6" rx="1.5" fill="#a855f7">
              <animate attributeName="height" values={`${3 + (i%3)*3};${7-(i%2)*2};${3 + (i%3)*3}`} dur={`${0.4 + i*0.1}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${3-(i%3)*1.5};${-1+(i%2)};${3-(i%3)*1.5}`} dur={`${0.4 + i*0.1}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </g>
      ) : (
        <path d="M35 60 Q50 66 65 60" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      )}

      {/* Head antenna */}
      <line x1="50" y1="10" x2="50" y2="28" stroke="#7c3aed" strokeWidth="2" />
      <circle cx="50" cy="8" r="4" fill="#a855f7">
        <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        <animate attributeName="r" values="4;5.5;4" dur="1s" repeatCount="indefinite" />
      </circle>

      {/* Side panels */}
      <rect x="14" y="38" width="8" height="14" rx="2" fill="#1a0533" stroke="#7c3aed" strokeWidth="1" />
      <rect x="78" y="38" width="8" height="14" rx="2" fill="#1a0533" stroke="#7c3aed" strokeWidth="1" />
      <line x1="16" y1="42" x2="20" y2="42" stroke="#a855f7" strokeWidth="1" />
      <line x1="16" y1="45" x2="20" y2="45" stroke="#a855f7" strokeWidth="1" opacity="0.5" />
      <line x1="16" y1="48" x2="20" y2="48" stroke="#a855f7" strokeWidth="1" />
      <line x1="80" y1="42" x2="84" y2="42" stroke="#a855f7" strokeWidth="1" />
      <line x1="80" y1="45" x2="84" y2="45" stroke="#a855f7" strokeWidth="1" opacity="0.5" />
      <line x1="80" y1="48" x2="84" y2="48" stroke="#a855f7" strokeWidth="1" />

      {/* Bottom connector */}
      <path d="M35 72 Q50 80 65 72" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.5" />

      <defs>
        <pattern id="scanlines" patternUnits="userSpaceOnUse" width="2" height="4">
          <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(168,85,247,0.4)" strokeWidth="1" />
        </pattern>
      </defs>
    </svg>
  );
}

// ── CEO — Personagem jogador ────────────────────────────────────────────────
export function CEO({ mood = "neutral", size = 140 }: { mood?: "neutral" | "happy" | "sad" | "thinking" | "excited"; size?: number }) {
  const skinColor = "#f5c5a3";
  const hairColor = "#2c1810";
  const suitColor = "#1e3a5f";
  const tieColor = "#dc2626";
  const shirtColor = "#f8fafc";

  const mouth = {
    neutral:  <path d="M42 76 Q50 79 58 76" stroke="#8b5a44" strokeWidth="2" fill="none" strokeLinecap="round" />,
    happy:    <path d="M40 74 Q50 83 60 74" stroke="#8b5a44" strokeWidth="2.5" fill="#f87171" strokeLinecap="round" />,
    excited:  <ellipse cx="50" cy="77" rx="9" ry="7" fill="#f87171" stroke="#8b5a44" strokeWidth="1.5" />,
    sad:      <path d="M42 80 Q50 73 58 80" stroke="#8b5a44" strokeWidth="2" fill="none" strokeLinecap="round" />,
    thinking: <path d="M42 76 Q48 76 52 74" stroke="#8b5a44" strokeWidth="2" fill="none" strokeLinecap="round" />,
  }[mood];

  const eyebrows = {
    neutral:  <><path d="M34 56 Q40 53 46 56" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M54 56 Q60 53 66 56" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
    happy:    <><path d="M34 53 Q40 50 46 53" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M54 53 Q60 50 66 53" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
    excited:  <><path d="M33 51 Q40 46 47 51" stroke={hairColor} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M53 51 Q60 46 67 51" stroke={hairColor} strokeWidth="3" fill="none" strokeLinecap="round" /></>,
    sad:      <><path d="M34 57 Q40 61 46 57" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M54 57 Q60 61 66 57" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
    thinking: <><path d="M34 56 Q40 53 46 56" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M54 53 Q61 51 67 55" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
  }[mood];

  const armLeft = mood === "excited"
    ? <path d="M24 105 Q10 85 18 70" stroke={suitColor} strokeWidth="14" strokeLinecap="round" fill="none" />
    : <path d="M24 105 Q15 120 20 135" stroke={suitColor} strokeWidth="14" strokeLinecap="round" fill="none" />;
  const armRight = mood === "excited"
    ? <path d="M76 105 Q90 85 82 70" stroke={suitColor} strokeWidth="14" strokeLinecap="round" fill="none" />
    : mood === "thinking"
      ? <path d="M76 105 Q88 100 82 85 Q78 74 58 72" stroke={suitColor} strokeWidth="14" strokeLinecap="round" fill="none" />
      : <path d="M76 105 Q85 120 80 135" stroke={suitColor} strokeWidth="14" strokeLinecap="round" fill="none" />;

  return (
    <svg width={size} height={Math.round(size * 1.6)} viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="50" cy="158" rx="22" ry="4" fill="black" opacity="0.25" />

      {/* Legs */}
      <rect x="32" y="135" width="15" height="22" rx="5" fill="#0f172a" />
      <rect x="53" y="135" width="15" height="22" rx="5" fill="#0f172a" />
      {/* Shoes */}
      <ellipse cx="39" cy="157" rx="10" ry="4" fill="#1e293b" />
      <ellipse cx="61" cy="157" rx="10" ry="4" fill="#1e293b" />

      {/* Body */}
      <rect x="22" y="95" width="56" height="45" rx="10" fill={suitColor} />
      {/* Suit lapels */}
      <path d="M50 97 L38 108 L36 97 Z" fill="#162c47" />
      <path d="M50 97 L62 108 L64 97 Z" fill="#162c47" />
      {/* Shirt */}
      <path d="M50 97 L43 110 L50 115 L57 110 Z" fill={shirtColor} />
      {/* Tie */}
      <path d="M47 100 L53 100 L52 118 L50 122 L48 118 Z" fill={tieColor} />
      <path d="M47 100 L50 104 L53 100 L50 97 Z" fill="#b91c1c" />
      {/* Suit buttons */}
      <circle cx="50" cy="126" r="1.5" fill="#162c47" />
      <circle cx="50" cy="132" r="1.5" fill="#162c47" />
      {/* Pocket square */}
      <path d="M28 104 L35 104 L34 100 L29 100 Z" fill={shirtColor} opacity="0.8" />

      {/* Arms */}
      {armLeft}
      {armRight}
      {/* Hands */}
      {mood === "excited" ? (
        <>
          <circle cx="17" cy="70" r="7" fill={skinColor} />
          <circle cx="83" cy="70" r="7" fill={skinColor} />
        </>
      ) : mood === "thinking" ? (
        <>
          <circle cx="20" cy="135" r="6" fill={skinColor} />
          <circle cx="57" cy="72" r="6" fill={skinColor} />
        </>
      ) : (
        <>
          <circle cx="20" cy="135" r="6" fill={skinColor} />
          <circle cx="80" cy="135" r="6" fill={skinColor} />
        </>
      )}

      {/* Neck */}
      <rect x="42" y="88" width="16" height="12" rx="4" fill={skinColor} />

      {/* Head */}
      <ellipse cx="50" cy="55" rx="28" ry="30" fill={skinColor} />

      {/* Hair */}
      <path d="M22 50 Q22 24 50 22 Q78 24 78 50 Q72 30 50 28 Q28 30 22 50 Z" fill={hairColor} />
      {/* Side burns */}
      <rect x="22" y="50" width="5" height="12" rx="2" fill={hairColor} />
      <rect x="73" y="50" width="5" height="12" rx="2" fill={hairColor} />

      {/* Ears */}
      <ellipse cx="22" cy="58" rx="5" ry="7" fill={skinColor} />
      <ellipse cx="78" cy="58" rx="5" ry="7" fill={skinColor} />
      <ellipse cx="22" cy="58" rx="3" ry="5" fill="#e8a882" />
      <ellipse cx="78" cy="58" rx="3" ry="5" fill="#e8a882" />

      {/* Eyebrows */}
      {eyebrows}

      {/* Eyes */}
      <ellipse cx="40" cy="63" rx="7" ry="7.5" fill="white" />
      <ellipse cx="60" cy="63" rx="7" ry="7.5" fill="white" />
      {/* Iris */}
      <circle cx="40" cy="64" r="4.5" fill="#1a4fc4" />
      <circle cx="60" cy="64" r="4.5" fill="#1a4fc4" />
      {/* Pupil */}
      <circle cx="40" cy="64" r="2.5" fill="#0a1628" />
      <circle cx="60" cy="64" r="2.5" fill="#0a1628" />
      {/* Glint */}
      <circle cx="41.5" cy="62" r="1.2" fill="white" />
      <circle cx="61.5" cy="62" r="1.2" fill="white" />

      {/* Nose */}
      <path d="M47 68 Q50 73 53 68" stroke="#c49070" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Mouth */}
      {mouth}

      {/* Cheeks — visible when happy/excited */}
      {(mood === "happy" || mood === "excited") && (
        <>
          <ellipse cx="34" cy="72" rx="7" ry="4" fill="#f87171" opacity="0.3" />
          <ellipse cx="66" cy="72" rx="7" ry="4" fill="#f87171" opacity="0.3" />
        </>
      )}

      {/* Thinking hand on chin */}
      {mood === "thinking" && (
        <circle cx="57" cy="72" r="6" fill={skinColor} />
      )}

      {/* Badge */}
      <rect x="57" y="108" width="18" height="13" rx="3" fill="#1e40af" opacity="0.9" />
      <rect x="59" y="110" width="14" height="9" rx="2" fill="#3b82f6" opacity="0.5" />
      <line x1="60" y1="113" x2="72" y2="113" stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1="60" y1="116" x2="68" y2="116" stroke="white" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// ── RIVAL — Concorrente ─────────────────────────────────────────────────────
export function Rival({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.4)} viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 8px rgba(239,68,68,0.4))" }}>
      {/* Shadow */}
      <ellipse cx="50" cy="138" rx="20" ry="3.5" fill="black" opacity="0.2" />
      {/* Legs */}
      <rect x="32" y="115" width="14" height="22" rx="5" fill="#1c0a0a" />
      <rect x="54" y="115" width="14" height="22" rx="5" fill="#1c0a0a" />
      <ellipse cx="39" cy="137" rx="9" ry="3.5" fill="#2d1515" />
      <ellipse cx="61" cy="137" rx="9" ry="3.5" fill="#2d1515" />
      {/* Body */}
      <rect x="22" y="80" width="56" height="40" rx="10" fill="#7f1d1d" />
      <path d="M50 82 L38 92 L36 82 Z" fill="#5a1111" />
      <path d="M50 82 L62 92 L64 82 Z" fill="#5a1111" />
      <path d="M47 84 L53 84 L52 100 L50 103 L48 100 Z" fill="#fbbf24" />
      {/* Arms */}
      <path d="M24 88 Q12 100 18 115" stroke="#7f1d1d" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M76 88 Q88 100 82 115" stroke="#7f1d1d" strokeWidth="13" strokeLinecap="round" fill="none" />
      <circle cx="18" cy="115" r="6" fill="#d97070" />
      <circle cx="82" cy="115" r="6" fill="#d97070" />
      {/* Neck */}
      <rect x="43" y="73" width="14" height="11" rx="3" fill="#d97070" />
      {/* Head */}
      <ellipse cx="50" cy="46" rx="26" ry="27" fill="#d97070" />
      {/* Hair */}
      <path d="M24 40 Q24 20 50 18 Q76 20 76 40 Q72 26 50 24 Q28 26 24 40 Z" fill="#1c0a0a" />
      <rect x="24" y="40" width="5" height="10" rx="2" fill="#1c0a0a" />
      <rect x="71" y="40" width="5" height="10" rx="2" fill="#1c0a0a" />
      {/* Ears */}
      <ellipse cx="23" cy="47" rx="4.5" ry="6" fill="#d97070" />
      <ellipse cx="77" cy="47" rx="4.5" ry="6" fill="#d97070" />
      {/* Eyebrows — menacing */}
      <path d="M30 42 Q37 38 44 41" stroke="#1c0a0a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M56 41 Q63 38 70 42" stroke="#1c0a0a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <ellipse cx="38" cy="50" rx="7" ry="7" fill="white" />
      <ellipse cx="62" cy="50" rx="7" ry="7" fill="white" />
      <circle cx="38" cy="51" r="4" fill="#dc2626" />
      <circle cx="62" cy="51" r="4" fill="#dc2626" />
      <circle cx="38" cy="51" r="2" fill="#1c0a0a" />
      <circle cx="62" cy="51" r="2" fill="#1c0a0a" />
      <circle cx="39" cy="49.5" r="1" fill="white" />
      <circle cx="63" cy="49.5" r="1" fill="white" />
      {/* Nose */}
      <path d="M46 58 Q50 63 54 58" stroke="#b55c5c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Smirk */}
      <path d="M40 66 Q52 62 62 68" stroke="#8b2222" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Scar */}
      <path d="M64 40 L67 52" stroke="#8b2222" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Speech Bubble ────────────────────────────────────────────────────────────
export function SpeechBubble({ text, from = "left", className = "" }: { text: string; from?: "left" | "right"; className?: string }) {
  return (
    <div className={`relative max-w-xs ${className}`}>
      <div className="bg-purple-950/80 border border-purple-700 rounded-2xl px-4 py-3 text-sm text-purple-100 leading-relaxed shadow-xl shadow-purple-900/30">
        {text}
      </div>
      <div className={`absolute bottom-0 w-4 h-4 ${from === "left" ? "-left-1.5" : "-right-1.5"}`}
        style={{
          background: "linear-gradient(135deg, #4c1d95, #581c87)",
          clipPath: from === "left" ? "polygon(100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 0 100%, 100% 100%)",
        }}
      />
    </div>
  );
}

// ── Floating animation wrapper ──────────────────────────────────────────────
export function FloatingWrapper({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{
      animation: `float 3s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      {children}
    </div>
  );
}
