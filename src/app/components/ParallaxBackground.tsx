import { useEffect, useRef } from 'react';

const ParallaxBackground = () => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!backgroundRef.current) return;
      const scrolled = window.scrollY;
      backgroundRef.current.style.transform = `translateY(${scrolled * 0.1}px)`;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" ref={backgroundRef}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800" />
      
      {/* Floating shapes with reduced motion */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-200/30 dark:bg-purple-900/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-float opacity-70" />
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-float-delayed opacity-70" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-green-200/30 dark:bg-green-900/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-float-slow opacity-70" />
      </div>
    </div>
  );
};

export default ParallaxBackground; 