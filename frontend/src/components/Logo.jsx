import React, { useId } from 'react';

/**
 * Baseera eye mark. Redrawn crisp SVG (almond eye + gradient iris + pupil).
 * `size` in px. `pupil` lets callers match the surface the mark sits on so
 * the pupil reads as a hole rather than a dark dot.
 */
export default function Logo({ size = 26, className = '', pupil = '#060D18' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`b-eye ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E6B0" />
          <stop offset="1" stopColor="#00B4D8" />
        </linearGradient>
      </defs>
      <path d="M11 50 Q50 19 89 50 Q50 81 11 50 Z" fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="15" fill={`url(#${id})`} />
      <circle cx="50" cy="50" r="6.5" fill={pupil} />
      <circle cx="45.5" cy="45.5" r="3" fill="#EAF1FA" opacity="0.85" />
    </svg>
  );
}
