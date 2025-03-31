"use client"

import { ReactNode, useRef, useEffect } from 'react';

interface ParallaxContainerProps {
  children: ReactNode;
  className?: string;
}

const ParallaxContainer = ({ children, className = "" }: ParallaxContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const parallaxItems = container.querySelectorAll('[data-parallax]');
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      parallaxItems.forEach((item) => {
        const element = item as HTMLElement;
        const speed = parseFloat(element.dataset.parallax || '0');
        const yPos = -(scrollY * speed);
        element.style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className={`${className} transition-colors duration-300`}
    >
      {children}
    </div>
  );
};

export default ParallaxContainer; 