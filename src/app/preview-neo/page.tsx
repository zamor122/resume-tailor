"use client";

import React, { useState, useRef } from "react";

export default function PreviewNeoRetrofuturisticPage() {
  const [isBoosted, setIsBoosted] = useState(false);
  const [score, setScore] = useState(44);
  const [xp, setXp] = useState(350);
  const [streak, setStreak] = useState(3);
  const [pokeCount, setPokeCount] = useState(0);
  const [mascotText, setMascotText] = useState("SYSTEM READY. INPUT RESUME & TARGET ROLE.");
  const [questCompleted, setQuestCompleted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio API Synthesizer for Retro-Tech Sound Effects (0 network assets needed)
  const playSound = (type: "click" | "boop" | "success") => {
    if (!audioEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "boop") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "success") {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
        });
      }
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  const mascotPhrases = [
    "DIAGNOSTIC ACTIVE: Scanning recruiter criteria...",
    "ANALYSIS: Google X-Y-Z formula doubles interview invitations!",
    "ATS RADAR: Calibrated and sweeping for keyword gaps.",
    "STATUS: 3-day mission streak verified! Keep momentum.",
    "TIP: Lead every bullet with a power action verb.",
  ];

  const handlePoke = () => {
    playSound("boop");
    const nextCount = pokeCount + 1;
    setPokeCount(nextCount);
    setMascotText(mascotPhrases[nextCount % mascotPhrases.length]);
  };

  const handleBoost = () => {
    playSound("click");
    if (!isBoosted) {
      let current = 44;
      const target = 94;
      const step = 2;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          clearInterval(timer);
          setScore(target);
          setIsBoosted(true);
          setXp((prev) => prev + 150);
          setStreak((prev) => prev + 1);
          setQuestCompleted(true);
          setMascotText("SURGE COMPLETE! 94% RELEVANCY — RECRUITER READY 🚀");
          playSound("success");
          triggerConfetti();
        } else {
          setScore(current);
        }
      }, 25);
    } else {
      setIsBoosted(false);
      setScore(44);
      setXp(350);
      setStreak(3);
      setQuestCompleted(false);
      setMascotText("SYSTEM READY. INPUT RESUME & TARGET ROLE.");
    }
  };

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Retrofuturistic Palette Confetti
    const colors = ["#FF5722", "#10B981", "#F59E0B", "#3B82F6", "#1C2028"];
    const particles = Array.from({ length: 90 }).map(() => ({
      x: canvas.width / 2 + (Math.random() * 200 - 100),
      y: canvas.height * 0.4,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -14 - 4,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 10,
      opacity: 1,
    }));

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45;
        p.rot += p.vrot;
        p.opacity -= 0.015;

        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      frame++;
      if (alive && frame < 120) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animate();
  };

  return (
    <div
      className="min-h-screen text-[#1C2028] p-4 md:p-8 relative selection:bg-[#FF5722] selection:text-white"
      style={{
        backgroundColor: "#FAF7F0",
        backgroundImage: "radial-gradient(#1C2028 0.75px, transparent 0.75px)",
        backgroundSize: "22px 22px",
      }}
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* Top Retro Console Control Bar */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="neo-box-sm bg-[#1C2028] text-white px-4 py-2 flex items-center justify-between text-xs font-mono tracking-wider flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
              <span>CONSOLE STATUS: ONLINE</span>
            </span>
            <span className="text-gray-500 hidden sm:inline">|</span>
            <span className="text-gray-300 hidden sm:inline">SERIES-2026 RETROFUTURISTIC EDITION</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="text-gray-300 hover:text-white flex items-center gap-1 text-[11px] font-bold uppercase transition-colors"
            >
              <span>{audioEnabled ? "🔊 SFX ON" : "🔇 SFX MUTED"}</span>
            </button>
            <span className="neo-tag bg-[#FF5722] text-white px-2 py-0.5 text-[10px] font-bold">
              WARM TECH
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Bar / Console Header */}
      <header className="max-w-6xl mx-auto mb-8">
        <nav className="neo-box bg-white px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#FF5722] neo-box-sm flex items-center justify-center font-black text-xl text-white shadow-[2px_2px_0px_#1C2028]">
              ⚡
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight block leading-none font-display text-[#1C2028]">
                AI RESUME TAILOR
              </span>
              <span className="text-[11px] text-gray-600 font-mono font-bold tracking-wider uppercase mt-0.5 block">
                Target Match & Relevancy Engine
              </span>
            </div>
          </div>

          {/* Gamified HUD Indicators */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Daily Streak Counter */}
            <div className="neo-box-sm bg-[#FFFDF8] px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold font-mono">
              <span className="text-orange-500 text-sm">🔥</span>
              <span>{streak} DAY MISSION</span>
            </div>

            {/* XP & Level Badge */}
            <div className="neo-box-sm bg-[#1C2028] text-white px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold font-mono">
              <span className="text-[#F59E0B]">⚡ {xp} XP</span>
              <span className="bg-[#FF5722] text-white px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">
                {xp >= 500 ? "LVL 3" : "LVL 2"}
              </span>
            </div>

            <button
              onClick={() => {
                playSound("click");
                alert("Sign In modal triggered!");
              }}
              className="neo-btn bg-[#FF5722] text-white px-5 py-2 text-sm font-bold tracking-wide uppercase"
            >
              Sign In
            </button>
          </div>
        </nav>
      </header>

      {/* Main Grid: Mission Hero & Interactive Lab */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Command & Interactive Tailor Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Hero Banner / Mission Brief */}
          <div className="neo-box bg-[#F4F1EA] p-6 md:p-8 relative overflow-hidden border-2 border-[#1C2028]">
            <div className="flex items-center justify-between mb-3">
              <div className="neo-tag bg-[#FF5722] text-white text-xs px-3 py-1 inline-flex items-center gap-1.5 font-bold uppercase tracking-wider font-mono">
                <span>🚀</span> Universal Application Optimizer
              </div>
              <span className="text-xs font-mono text-gray-500 hidden sm:inline">REF: ART-2026</span>
            </div>

            <h1 className="font-extrabold text-3xl md:text-5xl leading-tight mb-4 tracking-tight text-[#1C2028]">
              Engineered to make your resume <span className="bg-[#FF5722] text-white px-2 py-0.5 neo-box-sm inline-block rotate-[-1deg]">impossible to overlook.</span>
            </h1>

            <p className="text-sm md:text-base font-medium text-gray-700 max-w-xl leading-relaxed">
              Designed for everyone—from entry-level grads to seasoned professionals. We extract your concrete career achievements, format them with Google&apos;s proven X-Y-Z formula, and boost ATS keyword match rates instantly.
            </p>

            <div className="mt-5 pt-4 border-t-2 border-black/10 flex items-center gap-6 text-xs font-mono font-bold text-gray-600 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="text-[#10B981]">✓</span> 3 Free Tailors Included
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#10B981]">✓</span> Zero Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#10B981]">✓</span> Instant PDF & Word Ready
              </span>
            </div>
          </div>

          {/* Interactive Diagnostic Lab Chassis */}
          <div className="neo-box bg-white p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#1C2028] text-white flex items-center justify-center font-mono text-xs font-bold">
                  01
                </div>
                <h2 className="font-bold text-lg text-[#1C2028]">
                  Interactive Resume Laboratory
                </h2>
              </div>
              <span className="neo-tag bg-[#ECFDF5] text-[#065F46] text-[11px] px-2.5 py-0.5 font-mono font-bold">
                PROVEN X-Y-Z FORMULA
              </span>
            </div>

            {/* Original Input Preview */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider font-mono">
                  Current Bullet (Generic / Passive):
                </label>
                <span className="text-[10px] font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  ⚠️ Weak Metrics Detected
                </span>
              </div>
              <div className="neo-box-sm bg-[#FAF8F5] p-3 text-xs md:text-sm text-gray-800 font-mono border border-gray-300">
                &ldquo;Managed internal web tools, collaborated with cross-functional teams, and helped resolve ticket backlogs.&rdquo;
              </div>
            </div>

            {/* Target Job Keyword Radar */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider font-mono mb-2">
                ATS Keyword Deficiencies (Target Job Match):
              </label>
              <div className="flex flex-wrap gap-2">
                <span className="neo-tag bg-red-100 text-xs px-3 py-1 text-red-900 border border-red-300">
                  ✕ Cycle Time Metric
                </span>
                <span className="neo-tag bg-red-100 text-xs px-3 py-1 text-red-900 border border-red-300">
                  ✕ Jira / Agile Sprint SLA
                </span>
                <span className="neo-tag bg-red-100 text-xs px-3 py-1 text-red-900 border border-red-300">
                  ✕ 30% Efficiency Gain
                </span>
              </div>
            </div>

            {/* Action Button: Tactile Retro Switch */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <button
                onClick={handleBoost}
                className={`neo-btn ${
                  isBoosted ? "bg-[#F59E0B]" : "bg-[#FF5722]"
                } text-white px-7 py-3.5 text-base font-extrabold w-full sm:w-auto flex items-center justify-center gap-2.5 shadow-[4px_4px_0px_#1C2028]`}
              >
                <span>
                  {isBoosted ? "🎉 RE-RUN CALIBRATION" : "⚡ ACTIVATE ATS SURGE"}
                </span>
                {!isBoosted && (
                  <span className="bg-black/25 text-white text-[11px] px-2 py-0.5 rounded-full font-mono">
                    +150 XP
                  </span>
                )}
              </button>
              <span className="text-xs text-gray-600 font-medium">
                {isBoosted
                  ? "Click to reset and test again"
                  : "Tap to simulate the instant optimization"}
              </span>
            </div>

            {/* Dynamic Output Result: Retro Terminal Printout */}
            {isBoosted && (
              <div className="mt-5 p-4 neo-box-sm bg-[#1C2028] text-white border-2 border-[#1C2028] animate-fadeIn shadow-[3px_3px_0px_#10B981]">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
                  <span className="font-mono font-bold text-xs text-[#10B981] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                    OPTIMIZED PRINTOUT [GOOGLE X-Y-Z]:
                  </span>
                  <span className="neo-tag bg-[#10B981] text-[#1C2028] text-[10px] px-2 py-0.5 font-mono font-bold">
                    RELEVANCY: 94%
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium text-emerald-100 font-mono leading-relaxed">
                  &ldquo;Overhauled internal web ticketing operations across 4 cross-functional teams, cutting sprint resolution backlog by 32% and exceeding SLA targets by 14 days.&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: TailorBot MK-II & Relevancy Console (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* TailorBot MK-II Retro Hardware Unit */}
          <div className="neo-box bg-[#1C2028] p-6 text-white text-center relative overflow-hidden border-2 border-[#1C2028]">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-pulse"></span>
                <span>TAILORBOT MK-II</span>
              </span>
              <span>CALIBRATION: OK</span>
            </div>

            {/* Interactive Vintage CRT Mascot SVG */}
            <div
              className="w-40 h-40 mx-auto mb-2 relative cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
              onClick={handlePoke}
              title="Click TailorBot!"
            >
              <svg
                viewBox="0 0 160 160"
                className="w-full h-full drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]"
              >
                {/* Antenna Rod & Glowing Warm Beacon */}
                <line
                  x1="80"
                  y1="14"
                  x2="80"
                  y2="42"
                  stroke="#FAF8F5"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle
                  cx="80"
                  cy="12"
                  r="10"
                  fill={isBoosted ? "#10B981" : "#FF5722"}
                  stroke="#1C2028"
                  strokeWidth="3.5"
                />

                {/* CRT Monitor Chassis (Warm Ivory) */}
                <rect
                  x="26"
                  y="42"
                  width="108"
                  height="94"
                  rx="26"
                  fill="#FAF7F0"
                  stroke="#1C2028"
                  strokeWidth="6"
                />

                {/* Bezel Screws */}
                <circle cx="36" cy="52" r="2.5" fill="#1C2028" />
                <circle cx="124" cy="52" r="2.5" fill="#1C2028" />
                <circle cx="36" cy="126" r="2.5" fill="#1C2028" />
                <circle cx="124" cy="126" r="2.5" fill="#1C2028" />

                {/* CRT Inner Screen (Phosphor Dark Green) */}
                <rect
                  x="40"
                  y="56"
                  width="80"
                  height="48"
                  rx="14"
                  fill="#0D1F17"
                  stroke="#1C2028"
                  strokeWidth="3"
                />

                {/* Eyes (Phosphor Green Glowing Slits/Discs) */}
                <circle
                  cx="62"
                  cy="80"
                  r={isBoosted ? 9 : 7}
                  fill="#10B981"
                />
                <circle
                  cx="98"
                  cy="80"
                  r={isBoosted ? 9 : 7}
                  fill="#10B981"
                />

                {/* Analog Tuning Dial Knob on Lower Right */}
                <circle cx="112" cy="118" r="8" fill="#1C2028" />
                <line x1="112" y1="112" x2="112" y2="118" stroke="#FFFFFF" strokeWidth="2" />

                {/* Friendly Smile */}
                <path
                  d={
                    isBoosted
                      ? "M 62 118 Q 80 134 98 118"
                      : "M 66 120 Q 80 128 94 120"
                  }
                  stroke="#1C2028"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>

              <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono font-bold">
                TAP TO INTERACT 👆
              </span>
            </div>

            <h3 className="font-mono font-bold text-sm text-[#FAF7F0] mt-3 mb-1">
              {mascotText}
            </h3>
            <p className="text-[11px] text-gray-400 font-mono">
              TailorBot checks 40+ ATS criteria across every scan.
            </p>
          </div>

          {/* Analog Meter: ATS Relevancy Power Console */}
          <div className="neo-box bg-white p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-600 font-mono">
                ATS Relevancy Console
              </span>
              <span
                className={`neo-tag ${
                  score > 80
                    ? "bg-[#10B981] text-white"
                    : "bg-[#FF5722] text-white"
                } text-xs px-2.5 py-0.5 font-mono font-bold`}
              >
                {score > 80 ? "RECRUITER READY 🚀" : "BELOW THRESHOLD"}
              </span>
            </div>

            {/* Seven-Segment / Digital Score Display */}
            <div className="flex items-baseline justify-center gap-1 my-3 bg-[#FAF8F5] p-3 neo-box-sm border border-gray-300">
              <span className="font-black text-6xl tracking-tight text-[#1C2028] font-mono">
                {score}
              </span>
              <span className="font-bold text-2xl text-gray-500 font-mono">%</span>
            </div>

            {/* Vintage Meter Bar */}
            <div className="w-full bg-gray-200 neo-box-sm h-6 overflow-hidden p-0.5 relative mb-4">
              <div
                className={`h-full rounded-md transition-all duration-700 ease-out ${
                  score > 80 ? "bg-[#10B981]" : "bg-[#FF5722]"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>

            {/* Daily Mission / Quest Checklist */}
            <div className="border-t-2 border-black/10 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider font-mono">
                  Daily Mission Directives:
                </span>
                <span className="text-[10px] font-mono text-gray-400">RESET IN 4H</span>
              </div>
              
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 neo-box-sm bg-[#FAF8F5]">
                  <span className="font-bold flex items-center gap-2 text-gray-800">
                    <span className="text-emerald-600">✓</span> Scan 1 Target Resume
                  </span>
                  <span className="font-bold text-[#FF5722]">+100 XP</span>
                </div>
                
                <div
                  className={`flex items-center justify-between p-2 neo-box-sm ${
                    questCompleted ? "bg-[#ECFDF5] border-emerald-400" : "bg-gray-50"
                  }`}
                >
                  <span className="font-bold flex items-center gap-2 text-gray-800">
                    <span
                      className={
                        questCompleted
                          ? "text-emerald-600"
                          : "text-gray-400"
                      }
                    >
                      {questCompleted ? "✓" : "○"}
                    </span>{" "}
                    Achieve Relevancy &gt; 90%
                  </span>
                  <span className="font-bold text-[#FF5722]">+150 XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Milestone Unlock */}
          <div className="neo-box bg-[#F59E0B] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 neo-box-sm bg-white flex items-center justify-center text-xl text-[#1C2028] shadow-[2px_2px_0px_#1C2028]">
                🎖️
              </div>
              <div>
                <div className="font-bold text-sm text-[#1C2028]">
                  {xp >= 500
                    ? "Unlocked: 'Interview Magnet'"
                    : "Next: 'Interview Magnet'"}
                </div>
                <div className="text-[11px] text-black/80 font-mono font-medium">
                  {xp >= 500
                    ? "Level 3 reached! Top-tier resume badge active."
                    : `${500 - xp} XP needed to reach Level 3`}
                </div>
              </div>
            </div>
            <span className="neo-tag bg-[#1C2028] text-white text-[10px] px-2.5 py-1 font-mono font-bold">
              {xp >= 500 ? "UNLOCKED" : "TIER 3"}
            </span>
          </div>

        </div>

      </main>
    </div>
  );
}
