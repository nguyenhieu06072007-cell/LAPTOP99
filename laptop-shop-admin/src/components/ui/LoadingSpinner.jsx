import React from 'react';

const LoadingSpinner = ({ size = 'md', fullPage = false, text }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div 
        className={`animate-spin rounded-full border-indigo-200 border-t-indigo-600 ${sizeClasses[size]}`}
      />
      {text && <p className="mt-2 text-sm text-gray-500 font-medium">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 bg-opacity-75 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
