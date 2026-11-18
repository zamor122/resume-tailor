"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function PreviewNeoPage() {
  const [isBoosted, setIsBoosted] = useState(false);
  const [score, setScore] = useState(44);
  const [xp, setXp] = useState(350);
  const [streak, setStreak] = useState(3);
  const [pokeCount, setPokeCount] = useState(0);
  const [mascotText, setMascotText] = useState("Ready to scan! Drop your resume.");
  const [questCompleted, setQuestCompleted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mascotPhrases = [
    "Hey! That tickles! 🤖",
    "Keep tailoring, you're on a 3-day roll!",
    "Fun fact: Google X-Y-Z bullets double callback rates!",
    "I eat ATS keyword filters for breakfast 🥐",
    "Recruiters scan resumes in 6 seconds — make it count!",
  ];

  const handlePoke = () => {
    const nextCount = pokeCount + 1;
    setPokeCount(nextCount);
    setMascotText(mascotPhrases[nextCount % mascotPhrases.length]);
  };

  const handleBoost = () => {
    if (!isBoosted) {
      // Animate score counter from 44 to 94
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
          setMascotText("BAM! 94% Match! Recruiter eyes guaranteed! 🚀");
          triggerConfetti();
        } else {
          setScore(current);
        }
      }, 25);
    } else {
      // Reset
      setIsBoosted(false);
      setScore(44);
      setXp(350);
      setStreak(3);
      setQuestCompleted(false);
      setMascotText("Ready to scan! Drop your resume.");
    }
  };

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#FFE600", "#00E599", "#706BF6", "#FF5C5C", "#121212"];
    const particles = Array.from({ length: 80 }).map(() => ({
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
        p.vy += 0.45; // gravity
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
    <div className="min-h-screen bg-[#FFFDF8] text-[#121212] p-4 md:p-8 relative selection:bg-[#FFE600]">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* Top Notification / Beta Banner */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="neo-box-sm bg-[#FFE600] px-4 py-2 flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-2">
            <span>✨</span>
            <span>V2.0 SOFT NEO-BRUTALIST PREVIEW — INTERACTIVE GAMIFICATION DEMO</span>
          </span>
          <span className="neo-tag bg-white text-black px-2 py-0.5 text-[10px]">
            Live Sandbox
          </span>
        </div>
      </div>

      {/* Sticky Top Pill Navigation */}
      <header className="max-w-6xl mx-auto mb-8">
        <nav className="neo-box bg-white px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFE600] neo-box-sm flex items-center justify-center font-black text-xl">
              ✂️
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight block leading-none">
                AI Resume Tailor
              </span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Zero Generic Buzzwords
              </span>
            </div>
          </div>

          {/* Gamified User Status Pill */}
          <div className="flex items-center gap-3">
            <div className="neo-box-sm bg-[#FFFDF8] px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold">
              <span className="text-orange-500 animate-bounce">🔥</span>
              <span>{streak} Day Streak</span>
            </div>

            <div className="neo-box-sm bg-[#706BF6] text-white px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold">
              <span>⚡ {xp} XP</span>
              <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">
                {xp >= 500 ? "Lvl 3" : "Lvl 2"}
              </span>
            </div>

            <button
              onClick={() => alert("Sign In modal triggered!")}
              className="neo-btn bg-[#FFE600] px-4 py-2 text-sm font-bold"
            >
              Sign In
            </button>
          </div>
        </nav>
      </header>

      {/* Main Hero & Interactive Workspace Grid */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Value Prop & Interactive Input (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Headline Card */}
          <div className="neo-box bg-[#FFE600] p-6 md:p-8 relative overflow-hidden">
            <div className="neo-tag bg-white text-xs px-3 py-1 inline-flex items-center gap-1.5 mb-3 font-bold">
              <span>🎯</span> Beat the ATS Robot in 10 Seconds
            </div>
            <h1 className="font-black text-3xl md:text-5xl leading-tight mb-4 tracking-tight">
              Turn your boring resume into an{" "}
              <span className="bg-white px-2 py-0.5 neo-box-sm inline-block rotate-[-1deg]">
                interview magnet.
              </span>
            </h1>
            <p className="text-sm md:text-base font-medium text-black/80 max-w-xl">
              No generic filler. We extract your real achievements, rewrite
              bullets using Google&apos;s X-Y-Z formula, and boost your job match
              score before your eyes.
            </p>
          </div>

          {/* Live Interactive Tailor Challenge Card */}
          <div className="neo-box bg-white p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black/10">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧪</span>
                <h2 className="font-bold text-lg">Interactive Tailor Lab</h2>
              </div>
              <span className="neo-tag bg-[#A7F3D0] text-[11px] px-2.5 py-0.5 text-emerald-900 font-bold">
                First 3 Free
              </span>
            </div>

            {/* Sample Resume Bullet */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Original Bullet Point (Drab):
              </label>
              <div className="neo-box-sm bg-gray-50 p-3 text-xs md:text-sm text-gray-700 font-mono">
                &ldquo;Responsible for writing software and helping the backend
                team deploy changes to Kubernetes.&rdquo;
              </div>
            </div>

            {/* Target Job Keyword Tag Cloud */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Missing Target Keywords:
              </label>
              <div className="flex flex-wrap gap-2">
                <span className="neo-tag bg-[#FFD8D8] text-xs px-3 py-1 text-red-900">
                  ❌ CI/CD Latency
                </span>
                <span className="neo-tag bg-[#FFD8D8] text-xs px-3 py-1 text-red-900">
                  ❌ Microservices
                </span>
                <span className="neo-tag bg-[#FFD8D8] text-xs px-3 py-1 text-red-900">
                  ❌ +35% Metric
                </span>
              </div>
            </div>

            {/* Action Button with Tactile Feedback */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <button
                onClick={handleBoost}
                className={`neo-btn ${
                  isBoosted ? "bg-[#FFE600]" : "bg-[#00E599]"
                } text-[#121212] px-6 py-3 text-base font-extrabold w-full sm:w-auto flex items-center justify-center gap-2`}
              >
                <span>
                  {isBoosted ? "🎉 TAILORED (+150 XP)" : "⚡ BOOST ATS SCORE"}
                </span>
                {!isBoosted && (
                  <span className="bg-black text-white text-[11px] px-2 py-0.5 rounded-full">
                    +150 XP
                  </span>
                )}
              </button>
              <span className="text-xs text-gray-500 font-medium">
                {isBoosted
                  ? "Click to reset demo"
                  : "Click to test the live transformation"}
              </span>
            </div>

            {/* Dynamic Output Result */}
            {isBoosted && (
              <div className="mt-5 p-4 neo-box-sm bg-[#FAF5FF] border-2 border-purple-500 animate-fadeIn">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm text-[#706BF6] flex items-center gap-1.5">
                    <span>✨</span> TAILORED REWRITE (Google X-Y-Z):
                  </span>
                  <span className="neo-tag bg-[#706BF6] text-white text-[10px] px-2 py-0.5">
                    ATS Match: 94%
                  </span>
                </div>
                <p className="text-xs md:text-sm font-semibold text-gray-900 font-mono leading-relaxed">
                  &ldquo;Architected automated CI/CD microservices pipeline on
                  Kubernetes, reducing release cycle latency by 35% across 14
                  distributed backend services.&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: TailorBot Mascot & Scoreboard (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* TailorBot Mascot Card */}
          <div className="neo-box bg-[#706BF6] p-6 text-white text-center relative overflow-hidden">
            {/* Interactive Mascot SVG */}
            <div
              className="w-36 h-36 mx-auto mb-3 relative cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
              onClick={handlePoke}
              title="Click me!"
            >
              <svg
                viewBox="0 0 160 160"
                className="w-full h-full drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]"
              >
                {/* Antenna */}
                <line
                  x1="80"
                  y1="20"
                  x2="80"
                  y2="45"
                  stroke="#121212"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle
                  cx="80"
                  cy="18"
                  r="10"
                  fill={isBoosted ? "#00E599" : "#FFE600"}
                  stroke="#121212"
                  strokeWidth="4"
                />

                {/* Head Body */}
                <rect
                  x="30"
                  y="45"
                  width="100"
                  height="90"
                  rx="24"
                  fill="#FFFFFF"
                  stroke="#121212"
                  strokeWidth="6"
                />

                {/* Visor Screen */}
                <rect
                  x="42"
                  y="60"
                  width="76"
                  height="42"
                  rx="14"
                  fill="#121212"
                />

                {/* Eyes */}
                <circle
                  cx="62"
                  cy="81"
                  r={isBoosted ? 9 : 7}
                  fill="#00E599"
                />
                <circle
                  cx="98"
                  cy="81"
                  r={isBoosted ? 9 : 7}
                  fill="#00E599"
                />

                {/* Blush Spots */}
                <circle cx="48" cy="115" r="5" fill="#FF85A1" />
                <circle cx="112" cy="115" r="5" fill="#FF85A1" />

                {/* Smile */}
                <path
                  d={
                    isBoosted
                      ? "M 65 118 Q 80 132 95 118"
                      : "M 70 120 Q 80 128 90 120"
                  }
                  stroke="#121212"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              <span className="neo-tag bg-white text-black text-[10px] px-2 py-0.5 absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                Tap TailorBot! 👆
              </span>
            </div>

            <h3 className="font-extrabold text-lg mb-1">{mascotText}</h3>
            <p className="text-xs text-white/80">
              TailorBot scans 40+ ATS criteria in real-time.
            </p>
          </div>

          {/* Real-time ATS Relevancy Score Gauge */}
          <div className="neo-box bg-white p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-xs uppercase tracking-wider text-gray-600">
                Relevancy Power
              </span>
              <span
                className={`neo-tag ${
                  score > 80
                    ? "bg-[#00E599] text-black"
                    : "bg-[#FF5C5C] text-white"
                } text-xs px-2.5 py-0.5`}
              >
                {score > 80 ? "Offer Magnet 🚀" : "Scrapped by Bot"}
              </span>
            </div>

            {/* Big Score Number */}
            <div className="flex items-baseline justify-center gap-1 my-3">
              <span className="font-black text-6xl tracking-tight text-[#121212]">
                {score}
              </span>
              <span className="font-bold text-2xl text-gray-400">%</span>
            </div>

            {/* Progress Bar Meter */}
            <div className="w-full bg-gray-100 neo-box-sm h-6 overflow-hidden p-0.5 relative mb-4">
              <div
                className={`h-full rounded-lg transition-all duration-700 ease-out ${
                  score > 80 ? "bg-[#00E599]" : "bg-[#FF5C5C]"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>

            {/* Quests & Badges List */}
            <div className="border-t-2 border-black/10 pt-4">
              <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Today&apos;s Mini-Quests:
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 neo-box-sm bg-[#FFFDF8]">
                  <span className="font-semibold flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Tailor
                    1 resume
                  </span>
                  <span className="font-bold text-purple-600">+100 XP</span>
                </div>
                <div
                  className={`flex items-center justify-between p-2 neo-box-sm ${
                    questCompleted ? "bg-[#FFFDF8]" : "bg-gray-50"
                  }`}
                >
                  <span className="font-semibold flex items-center gap-2 text-gray-700">
                    <span
                      className={
                        questCompleted
                          ? "text-emerald-500 font-bold"
                          : "text-gray-400"
                      }
                    >
                      {questCompleted ? "✓" : "○"}
                    </span>{" "}
                    Boost match score &gt; 90%
                  </span>
                  <span className="font-bold text-purple-600">+150 XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unlocked Badge Showcase */}
          <div className="neo-box bg-[#FFE600] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 neo-box-sm bg-white flex items-center justify-center text-xl">
                🏆
              </div>
              <div>
                <div className="font-bold text-sm">
                  {xp >= 500
                    ? "Unlocked: 'ATS Assassin'!"
                    : "Next: 'ATS Assassin'"}
                </div>
                <div className="text-[11px] text-black/70">
                  {xp >= 500
                    ? "Tier unlocked! Priority queue active."
                    : `${500 - xp} XP remaining to unlock next tier`}
                </div>
              </div>
            </div>
            <span className="neo-tag bg-black text-white text-[11px] px-2.5 py-1">
              {xp >= 500 ? "Active" : "Lvl 3 Perk"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
