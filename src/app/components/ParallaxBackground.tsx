"use client";

import { useTheme } from "./ThemeProvider";

const ParallaxBackground = () => {
  const { design } = useTheme();
  const isPom = design === "pomegranate";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {isPom ? (
        <>
          <div className="absolute top-[-12%] left-[-8%] w-[38%] h-[38%] bg-[#EA375D]/[0.06] rounded-full blur-3xl" />
          <div className="absolute top-[55%] right-[-8%] w-[32%] h-[38%] bg-[#F7B93E]/[0.10] rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[24%] w-[28%] h-[32%] bg-[#7BC6FA]/[0.08] rounded-full blur-3xl" />
        </>
      ) : (
        <>
          <div className="absolute top-[-12%] left-[-8%] w-[40%] h-[40%] bg-[#2B6B5A]/[0.06] rounded-full blur-3xl" />
          <div className="absolute top-[55%] right-[-8%] w-[34%] h-[38%] bg-[#D65A38]/[0.06] rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[22%] w-[30%] h-[30%] bg-[#D69B24]/[0.06] rounded-full blur-3xl" />
        </>
      )}
    </div>
  );
};

export default ParallaxBackground;
