'use client'

import React from 'react';

const HelloButton = () => {
  const handleClick = () => {
    alert('Hello!');
  };

  return (
    <button 
      onClick={handleClick}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      Say Hello
    </button>
  );
};

export default HelloButton; 