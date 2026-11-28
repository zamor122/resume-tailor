"use client";

import React, { useEffect, useState } from "react";
import {
  BOT_QUIPS,
  DesignTheme,
  PERSONAS,
  PersonaDataset,
  PersonaKey,
  SitePage,
} from "./prototypeData";

/* ============================================================================
 * BESPOKE CRISP SVG ICON SET (Zero emoji clutter, theme-aware strokes)
 * ========================================================================== */

export type IconName =
  | "home"
  | "sparkle"
  | "ai"
  | "talent"
  | "pricing"
  | "profile"
  | "agents"
  | "settings"
  | "check"
  | "arrow"
  | "shield"
  | "lock"
  | "copy"
  | "download"
  | "timer"
  | "bolt"
  | "layers"
  | "document"
  | "code"
  | "eye"
  | "mail"
  | "close"
  | "chevron";

export function ProtoIcon({
  name,
  size = 18,
  color = "currentColor",
  strokeWidth = 2,
  className = "",
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...props}>
          <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" />
          <path d="M9.5 14.5c.8.9 1.6 1.3 2.5 1.3s1.7-.4 2.5-1.3" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...props}>
          <path d="M12 3l2.1 5.6L19.5 11l-5.4 2.4L12 19l-2.1-5.6L4.5 11l5.4-2.4L12 3Z" />
        </svg>
      );
    case "ai":
      return (
        <svg {...props}>
          <rect x="6" y="6" width="12" height="12" rx="3" />
          <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "talent":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1.2" fill={color} />
        </svg>
      );
    case "pricing":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="3" />
          <path d="M3 10.5h18" />
          <path d="M7.5 14.5h3" />
        </svg>
      );
    case "profile":
      return (
        <svg {...props}>
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5.5 19.5c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
        </svg>
      );
    case "agents":
      return (
        <svg {...props}>
          <path d="M7 8l-4 4 4 4" />
          <path d="M17 8l4 4-4 4" />
          <path d="M14 4l-4 16" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.8 1.2M17.3 16.3l1.8 1.2M3 12h2.2M18.8 12H21M4.9 17.5l1.8-1.2M17.3 7.7l1.8-1.2" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...props}>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3l7 3v5.5c0 4.6-3 7.8-7 9.5-4-1.7-7-4.9-7-9.5V6l7-3Z" />
          <path d="M9.2 12.2l2 2 3.8-4" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="5" y="11" width="14" height="9" rx="2.5" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "copy":
      return (
        <svg {...props}>
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "download":
      return (
        <svg {...props}>
          <path d="M12 4v11" />
          <path d="M7.5 11.5 12 16l4.5-4.5" />
          <path d="M4.5 19.5h15" />
        </svg>
      );
    case "timer":
      return (
        <svg {...props}>
          <circle cx="12" cy="13" r="7.5" />
          <path d="M12 9.5v3.5l2.5 1.5" />
          <path d="M9.5 3h5" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...props}>
          <path d="M13 2.5 5.5 13h5.5l-1 8.5L18.5 11H13l0-8.5Z" />
        </svg>
      );
    case "layers":
      return (
        <svg {...props}>
          <path d="M12 3 3.5 8 12 13l8.5-5L12 3Z" />
          <path d="M3.5 12.5 12 17.5l8.5-5" />
          <path d="M3.5 16.5 12 21.5l8.5-5" />
        </svg>
      );
    case "document":
      return (
        <svg {...props}>
          <path d="M7 3.5h7l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "code":
      return (
        <svg {...props}>
          <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13 7l-2 10" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );
    case "mail":
      return (
        <svg {...props}>
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      );
    case "close":
      return (
        <svg {...props}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...props}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
  }
}

/* ============================================================================
 * THEME-HARMONIZED TAILORBOT CHARACTER
 * Keeps the beloved retro CRT mascot while matching each art direction's soul
 * ========================================================================== */

export function BrandTailorBot({
  theme,
  state = "celebrating",
  size = 56,
  onPoke,
}: {
  theme: DesignTheme;
  state?: "idle" | "scanning" | "celebrating";
  size?: number;
  onPoke?: () => void;
}) {
  const isPom = theme === "pomegranate";
  const ink = isPom ? "#3A0C22" : "#241F1A";
  const chassis = isPom ? "#FFFDF5" : "#FFFDF8";
  const screenBg = isPom ? "#2A0A19" : "#1C352D";
  const eyeColor =
    state === "scanning"
      ? isPom
        ? "#F7B93E"
        : "#E6AD30"
      : isPom
      ? "#74D4A0"
      : "#7DD3A8";
  const beaconColor =
    state === "celebrating"
      ? isPom
        ? "#F7B93E"
        : "#2B6B5A"
      : state === "scanning"
      ? isPom
        ? "#7BC6FA"
        : "#D69B24"
      : isPom
      ? "#EA375D"
      : "#D65A38";

  const svgContent = (
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        {/* Risograph soft offset ink halo */}
        {!isPom && (
          <rect
            x="31"
            y="47"
            width="108"
            height="92"
            rx="28"
            fill="#D65A38"
            opacity="0.18"
          />
        )}

        {/* Antenna stem & beacon */}
        <line
          x1="80"
          y1="16"
          x2="80"
          y2="42"
          stroke={ink}
          strokeWidth={isPom ? 5.5 : 4.5}
          strokeLinecap="round"
        />
        <circle
          cx="80"
          cy="14"
          r="10"
          fill={beaconColor}
          stroke={ink}
          strokeWidth={isPom ? 4.5 : 3.5}
        />

        {/* Rounded CRT Monitor Body */}
        <rect
          x="26"
          y="42"
          width="108"
          height="92"
          rx="28"
          fill={chassis}
          stroke={ink}
          strokeWidth={isPom ? 6 : 4.5}
        />

        {/* Inner CRT Screen */}
        <rect
          x="40"
          y="55"
          width="80"
          height="46"
          rx="15"
          fill={screenBg}
          stroke={ink}
          strokeWidth={isPom ? 3.5 : 2.5}
        />

        {/* Expressive Eyes */}
        {state === "celebrating" ? (
          <>
            <path
              d="M 55 80 Q 63 70 71 80"
              fill="none"
              stroke={eyeColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 89 80 Q 97 70 105 80"
              fill="none"
              stroke={eyeColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
          </>
        ) : state === "scanning" ? (
          <>
            <rect x="55" y="74" width="16" height="8" rx="4" fill={eyeColor} />
            <rect x="89" y="74" width="16" height="8" rx="4" fill={eyeColor} />
          </>
        ) : (
          <>
            <circle cx="63" cy="78" r="7.5" fill={eyeColor} />
            <circle cx="97" cy="78" r="7.5" fill={eyeColor} />
          </>
        )}

        {/* Rosy cheeks on Pomegranate or subtle dial on Risograph */}
        {isPom ? (
          <>
            <circle cx="48" cy="115" r="5" fill="#F284B6" opacity="0.7" />
            <circle cx="112" cy="115" r="5" fill="#F284B6" opacity="0.7" />
          </>
        ) : (
          <circle cx="112" cy="116" r="6" fill="#2B6B5A" opacity="0.85" />
        )}

        {/* Warm Friendly Smile */}
        <path
          d={
            state === "celebrating"
              ? "M 64 114 Q 80 128 96 114"
              : "M 68 116 Q 80 123 92 116"
          }
          stroke={ink}
          strokeWidth={isPom ? 5 : 4}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
  );

  if (!onPoke) {
    return (
      <span
        className="relative inline-flex items-center justify-center select-none"
        style={{ width: size, height: size }}
      >
        {svgContent}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onPoke}
      aria-label="Interact with TailorBot mascot"
      className="relative inline-flex items-center justify-center select-none transition-transform cursor-pointer hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ width: size, height: size }}
    >
      {svgContent}
    </button>
  );
}

/* ============================================================================
 * ENHANCED CONCENTRIC RAINBOW ARC GAUGE
 * Faithful to Pomegranate's checkmarked rainbow arcs & Risograph's print rings
 * ========================================================================== */

export interface ArcMetric {
  id: string;
  label: string;
  valueLabel: string;
  pct: number;
  color: string;
  complete: boolean;
}

export function InteractiveArcGauge({
  theme,
  metrics,
  selectedId,
  onSelect,
  compact = false,
}: {
  theme: DesignTheme;
  metrics: ArcMetric[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  compact?: boolean;
}) {
  const isPom = theme === "pomegranate";
  const ink = isPom ? "#3A0C22" : "#241F1A";
  const track = isPom ? "#F3EDE0" : "#EAE2D2";
  const radii = [112, 89, 66, 43];
  const cx = 140;
  const cy = 136;

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox="0 0 280 152"
        className={`w-full overflow-visible ${
          compact ? "max-w-[265px]" : "max-w-[310px]"
        }`}
        role="img"
        aria-label="Resume optimization breakdown concentric arcs"
      >
        {metrics.slice(0, 4).map((m, idx) => {
          const r = radii[idx];
          const clampedPct = Math.max(0.14, Math.min(0.98, m.pct));
          const angle = Math.PI * (1 - clampedPct); // PI (left) -> 0 (right)
          const endX = cx + r * Math.cos(angle);
          const endY = cy - r * Math.sin(angle);
          const len = Math.PI * r;
          const dash = len * clampedPct;
          const isSelected = selectedId === m.id;
          const dimmed = selectedId !== null && !isSelected;

          return (
            <g
              key={m.id}
              onClick={() => onSelect(isSelected ? null : m.id)}
              className="cursor-pointer transition-opacity"
              style={{ opacity: dimmed ? 0.38 : 1 }}
            >
              {/* Soft background semicircle track */}
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                fill="none"
                stroke={track}
                strokeWidth={isPom ? 15 : 13}
                strokeLinecap="round"
              />

              {/* Crisp deep-plum tactile outline (Pomegranate signature) */}
              {isPom && (
                <path
                  d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                  fill="none"
                  stroke={ink}
                  strokeWidth={18}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${len}`}
                />
              )}

              {/* Colored progress arc */}
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                fill="none"
                stroke={m.color}
                strokeWidth={isPom ? 14.2 : 12.5}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${len}`}
              />

              {/* Endpoint badge — matches Pomegranate checkmarked circles & dark rings */}
              {isPom ? (
                m.complete ? (
                  <g transform={`translate(${endX}, ${endY})`}>
                    <circle
                      r="8.5"
                      fill="#FFFDF5"
                      stroke={ink}
                      strokeWidth="2.2"
                    />
                    <circle r="6" fill={ink} />
                    <path
                      d="M -2.6 0.2 L -0.6 2.2 L 2.9 -1.8"
                      fill="none"
                      stroke="#FFFDF5"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                ) : (
                  <g transform={`translate(${endX}, ${endY})`}>
                    <circle r="8.2" fill={ink} />
                    <circle r="3.2" fill={m.color} />
                  </g>
                )
              ) : (
                <g transform={`translate(${endX}, ${endY})`}>
                  <circle
                    r="6.5"
                    fill="#FFFDF8"
                    stroke={m.color}
                    strokeWidth="2.8"
                  />
                  {m.complete && <circle r="2.3" fill={m.color} />}
                </g>
              )}
            </g>
          );
        })}

        {/* Bottom-center tiny emblem (like the tiny pomegranate berry in screenshot!) */}
        {isPom ? (
          <g transform={`translate(${cx}, ${cy - 4})`}>
            <circle r="10.5" fill="#EA375D" stroke="#3A0C22" strokeWidth="1.8" />
            <path
              d="M -4 -9 L -1.5 -12.5 L 0 -10.2 L 1.5 -12.5 L 4 -9"
              fill="#EA375D"
              stroke="#3A0C22"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M 0 -4.2 L 1.2 -1.2 L 4.2 0 L 1.2 1.2 L 0 4.2 L -1.2 1.2 L -4.2 0 L -1.2 -1.2 Z"
              fill="#FFFDF5"
            />
          </g>
        ) : (
          <g transform={`translate(${cx}, ${cy - 4})`}>
            <circle
              r="11"
              fill="#FFFDF8"
              stroke="#241F1A"
              strokeOpacity="0.16"
              strokeWidth="1.2"
            />
            <circle r="4.5" fill="#2B6B5A" />
          </g>
        )}
      </svg>

      {/* Glanceable Legend Pills (Interactive) */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
        {metrics.map((m) => {
          const active = selectedId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(active ? null : m.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                isPom
                  ? active
                    ? "bg-[#3A0C22] text-[#FFFDF5] border border-[#3A0C22]"
                    : "bg-[#F6F1E4] text-[#3A0C22] border border-[#3A0C22]/20 hover:border-[#3A0C22]"
                  : active
                  ? "bg-[#241F1A] text-[#FFFDF8] border border-[#241F1A]"
                  : "bg-[#EFE8DA] text-[#241F1A] border border-[#241F1A]/10 hover:border-[#241F1A]/30"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: m.color,
                  border: isPom ? "1.2px solid #3A0C22" : "none",
                }}
              />
              <span>{m.label}</span>
              <span className="opacity-75 font-bold">{m.valueLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
 * SHARED LIVE APPLICATION STATE FOR BOTH PROTOTYPES
 * Every page is genuinely interactive so Shayne can test real end-to-end UX
 * ========================================================================== */

export interface PrototypeAppState {
  persona: PersonaDataset;
  activePage: SitePage;
  setActivePage: (p: SitePage) => void;
  // Tailor Studio
  tailorView: "results" | "input";
  setTailorView: (v: "results" | "input") => void;
  isTailoring: boolean;
  runTailorDemo: () => void;
  approvedBullets: Record<string, boolean>;
  toggleBullet: (id: string) => void;
  expandedWhyId: string | null;
  setExpandedWhyId: (id: string | null) => void;
  selectedArcId: string | null;
  setSelectedArcId: (id: string | null) => void;
  tonePreset: "concise" | "xyz" | "ats";
  setTonePreset: (t: "concise" | "xyz" | "ats") => void;
  liveScore: number;
  approvedCount: number;
  // TailorBot interactions
  botState: "idle" | "scanning" | "celebrating";
  botQuipIndex: number;
  pokeBot: () => void;
  getBotQuip: (theme: DesignTheme) => string;
  // Futureproof
  selectedRoleChip: string;
  setSelectedRoleChip: (id: string) => void;
  selectedToolIds: Record<string, boolean>;
  toggleTool: (id: string) => void;
  selectedToolCount: number;
  activeTimerToolId: string | null;
  timerSeconds: number;
  startScriptTimer: (toolId: string) => void;
  stopScriptTimer: () => void;
  // Talent Network
  talentTab: "controls" | "card" | "inbox";
  setTalentTab: (t: "controls" | "card" | "inbox") => void;
  discoveryOn: boolean;
  setDiscoveryOn: (v: boolean) => void;
  showSalaryFloor: boolean;
  setShowSalaryFloor: (v: boolean) => void;
  blockedDomain: string;
  setBlockedDomain: (v: string) => void;
  cardViewMode: "human" | "json";
  setCardViewMode: (m: "human" | "json") => void;
  introModalOpen: boolean;
  setIntroModalOpen: (v: boolean) => void;
  recruiterEmailInput: string;
  setRecruiterEmailInput: (v: string) => void;
  introSubmitState: "idle" | "blocked_free" | "blocked_employer" | "sent";
  submitIntroRequest: (e: React.FormEvent) => void;
  inboxDecision: "pending" | "accepted" | "declined";
  setInboxDecision: (d: "pending" | "accepted" | "declined") => void;
  // Pricing & Pass
  hasPass: boolean;
  activePassLabel: string;
  activateDemoPass: (label: string) => void;
  togglePassTier: () => void;
  openFaqIdx: number | null;
  setOpenFaqIdx: (idx: number | null) => void;
  // Export PDF Modal & Toast
  exportModalOpen: boolean;
  setExportModalOpen: (v: boolean) => void;
  pdfTemplate: "executive" | "clinical" | "minimal";
  setPdfTemplate: (t: "executive" | "clinical" | "minimal") => void;
  toastMessage: string | null;
  triggerToast: (msg: string) => void;
}

export function usePrototypeAppState(
  personaKey: PersonaKey
): PrototypeAppState {
  const persona = PERSONAS[personaKey];
  const [activePage, setActivePage] = useState<SitePage>("tailor");

  // Tailor Studio
  const [tailorView, setTailorView] = useState<"results" | "input">("results");
  const [isTailoring, setIsTailoring] = useState(false);
  const [approvedBullets, setApprovedBullets] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      Object.values(PERSONAS).flatMap((p) =>
        p.bullets.map((b) => [b.id, true])
      )
    )
  );
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);
  const [tonePreset, setTonePreset] = useState<"concise" | "xyz" | "ats">("xyz");

  // Bot
  const [botState, setBotState] = useState<"idle" | "scanning" | "celebrating">(
    "celebrating"
  );
  const [botQuipIndex, setBotQuipIndex] = useState(0);

  // Futureproof
  const [selectedRoleChipByPersona, setSelectedRoleChipByPersona] = useState<
    Record<PersonaKey, string>
  >({ doctor: "doctor", admin: "admin" });
  const selectedRoleChip = selectedRoleChipByPersona[personaKey];
  const setSelectedRoleChip = (id: string) =>
    setSelectedRoleChipByPersona((prev) => ({ ...prev, [personaKey]: id }));

  const [selectedToolIds, setSelectedToolIds] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      Object.values(PERSONAS).flatMap((p) =>
        p.futureproofTools.map((t) => [t.id, t.defaultSelected])
      )
    )
  );
  const [activeTimerToolId, setActiveTimerToolId] = useState<string | null>(
    null
  );
  const [timerSeconds, setTimerSeconds] = useState(30);

  // Talent Network
  const [talentTab, setTalentTab] = useState<"controls" | "card" | "inbox">(
    "controls"
  );
  const [discoveryOn, setDiscoveryOn] = useState(true);
  const [showSalaryFloor, setShowSalaryFloor] = useState(true);
  const [blockedDomainByPersona, setBlockedDomainByPersona] = useState<
    Record<PersonaKey, string>
  >({
    doctor: PERSONAS.doctor.blockedDomainDefault,
    admin: PERSONAS.admin.blockedDomainDefault,
  });
  const blockedDomain = blockedDomainByPersona[personaKey];
  const setBlockedDomain = (v: string) =>
    setBlockedDomainByPersona((prev) => ({ ...prev, [personaKey]: v }));

  const [cardViewMode, setCardViewMode] = useState<"human" | "json">("human");
  const [introModalOpen, setIntroModalOpen] = useState(false);
  const [recruiterEmailByPersona, setRecruiterEmailByPersona] = useState<
    Record<PersonaKey, string>
  >({
    doctor: PERSONAS.doctor.sampleIntro.recruiterEmail,
    admin: PERSONAS.admin.sampleIntro.recruiterEmail,
  });
  const recruiterEmailInput = recruiterEmailByPersona[personaKey];
  const setRecruiterEmailInput = (v: string) =>
    setRecruiterEmailByPersona((prev) => ({ ...prev, [personaKey]: v }));

  const [introSubmitState, setIntroSubmitState] = useState<
    "idle" | "blocked_free" | "blocked_employer" | "sent"
  >("idle");
  const [inboxDecisionByPersona, setInboxDecisionByPersona] = useState<
    Record<PersonaKey, "pending" | "accepted" | "declined">
  >({ doctor: "pending", admin: "pending" });
  const inboxDecision = inboxDecisionByPersona[personaKey];
  const setInboxDecision = (d: "pending" | "accepted" | "declined") =>
    setInboxDecisionByPersona((prev) => ({ ...prev, [personaKey]: d }));

  // Pricing & Pass
  const [hasPass, setHasPass] = useState(true);
  const [activePassLabel, setActivePassLabel] = useState("Pro Week · 6d left");
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Export Modal & Toast
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState<
    "executive" | "clinical" | "minimal"
  >("executive");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 30s interview script practice timer
  useEffect(() => {
    if (!activeTimerToolId) return;
    const id = window.setTimeout(() => {
      if (timerSeconds <= 1) {
        setActiveTimerToolId(null);
        setTimerSeconds(30);
      } else {
        setTimerSeconds((s) => s - 1);
      }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [activeTimerToolId, timerSeconds]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const toggleBullet = (id: string) => {
    setApprovedBullets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTool = (id: string) => {
    setSelectedToolIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const runTailorDemo = () => {
    setIsTailoring(true);
    setBotState("scanning");
    window.setTimeout(() => {
      setIsTailoring(false);
      setTailorView("results");
      setBotState("celebrating");
      triggerToast("Tailored! Match jumped +34 pts");
    }, 750);
  };

  const pokeBot = () => {
    setBotQuipIndex((i) => i + 1);
    setBotState((s) =>
      s === "celebrating" ? "idle" : s === "idle" ? "scanning" : "celebrating"
    );
  };

  const getBotQuip = (theme: DesignTheme) => {
    const list = BOT_QUIPS[theme];
    return list[botQuipIndex % list.length];
  };

  const startScriptTimer = (toolId: string) => {
    setActiveTimerToolId(toolId);
    setTimerSeconds(30);
  };

  const stopScriptTimer = () => {
    setActiveTimerToolId(null);
    setTimerSeconds(30);
  };

  const submitIntroRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = recruiterEmailInput.trim().toLowerCase();
    const domain = cleaned.split("@")[1] || "";
    const freeDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
    ];
    if (!domain || freeDomains.includes(domain)) {
      setIntroSubmitState("blocked_free");
      return;
    }
    if (
      blockedDomain.trim() &&
      domain === blockedDomain.trim().toLowerCase()
    ) {
      setIntroSubmitState("blocked_employer");
      return;
    }
    setIntroSubmitState("sent");
    triggerToast("Intro request sent for double-opt-in review");
  };

  const activateDemoPass = (label: string) => {
    setHasPass(true);
    setActivePassLabel(`${label} · Active`);
    triggerToast(`${label} unlocked across the prototype!`);
  };

  const togglePassTier = () => {
    setHasPass((prev) => {
      const next = !prev;
      setActivePassLabel(next ? "Pro Week · 6d left" : "Free Tier");
      return next;
    });
  };

  const approvedCount = persona.bullets.filter(
    (b) => approvedBullets[b.id]
  ).length;
  const gainedScore = persona.bullets.reduce(
    (acc, b) => acc + (approvedBullets[b.id] ? b.scoreGain : 0),
    0
  );
  const liveScore = Math.min(98, persona.baseScore + gainedScore);
  const selectedToolCount = persona.futureproofTools.filter(
    (t) => selectedToolIds[t.id]
  ).length;

  return {
    persona,
    activePage,
    setActivePage,
    tailorView,
    setTailorView,
    isTailoring,
    runTailorDemo,
    approvedBullets,
    toggleBullet,
    expandedWhyId,
    setExpandedWhyId,
    selectedArcId,
    setSelectedArcId,
    tonePreset,
    setTonePreset,
    liveScore,
    approvedCount,
    botState,
    botQuipIndex,
    pokeBot,
    getBotQuip,
    selectedRoleChip,
    setSelectedRoleChip,
    selectedToolIds,
    toggleTool,
    selectedToolCount,
    activeTimerToolId,
    timerSeconds,
    startScriptTimer,
    stopScriptTimer,
    talentTab,
    setTalentTab,
    discoveryOn,
    setDiscoveryOn,
    showSalaryFloor,
    setShowSalaryFloor,
    blockedDomain,
    setBlockedDomain,
    cardViewMode,
    setCardViewMode,
    introModalOpen,
    setIntroModalOpen,
    recruiterEmailInput,
    setRecruiterEmailInput,
    introSubmitState,
    submitIntroRequest,
    inboxDecision,
    setInboxDecision,
    hasPass,
    activePassLabel,
    activateDemoPass,
    togglePassTier,
    openFaqIdx,
    setOpenFaqIdx,
    exportModalOpen,
    setExportModalOpen,
    pdfTemplate,
    setPdfTemplate,
    toastMessage,
    triggerToast,
  };
}
