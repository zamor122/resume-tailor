import { ReactNode } from 'react';

interface ParallaxContainerProps {
  children: ReactNode;
  className?: string;
}

const ParallaxContainer: React.FC<ParallaxContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative z-10 ${className}`}>
      {children}
    </div>
  );
};

export default ParallaxContainer; 