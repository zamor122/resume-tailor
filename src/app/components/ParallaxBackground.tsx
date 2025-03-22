"use client"

import { useTheme } from './ThemeProvider';

const ParallaxBackground = () => {
  const { theme } = useTheme();
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Light mode background elements */}
      {theme === 'light' && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-cyan-200/50 to-blue-300/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-[60%] right-[-5%] w-[30%] h-[40%] bg-gradient-to-br from-fuchsia-200/40 to-purple-300/20 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-[40%] left-[20%] w-[25%] h-[30%] bg-gradient-to-br from-amber-200/30 to-yellow-300/20 rounded-full blur-3xl animate-float-slow" />
        </>
      )}
      
      {/* Dark mode background elements */}
      {theme === 'dark' && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-cyan-900/30 to-blue-800/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-[60%] right-[-5%] w-[30%] h-[40%] bg-gradient-to-br from-fuchsia-900/30 to-purple-800/20 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-[40%] left-[20%] w-[25%] h-[30%] bg-gradient-to-br from-amber-900/20 to-yellow-800/10 rounded-full blur-3xl animate-float-slow" />
        </>
      )}
    </div>
  );
};

export default ParallaxBackground; 