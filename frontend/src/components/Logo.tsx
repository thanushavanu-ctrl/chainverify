import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = "",
  size = "md",
  showText = true,
}) => {
  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 text-white shadow-md shadow-brand-500/20 p-2 ${iconSizes[size]}`}>
        {/* Shield with interconnected chain links */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Shield Outline */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {/* Linked Chain symbol inside shield */}
          <path d="m9 11 3 3" />
          <path d="m15 13-3-3" />
          <circle cx="9" cy="14" r="1.5" />
          <circle cx="15" cy="10" r="1.5" />
        </svg>
      </div>

      {showText && (
        <span className={`text-slate-900 font-extrabold ${textSizes[size]}`}>
          Chain<span className="text-brand-600">Verify</span>
        </span>
      )}
    </div>
  );
};
