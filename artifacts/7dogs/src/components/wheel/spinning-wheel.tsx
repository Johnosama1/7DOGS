import { useState, useEffect } from "react";
import type { WheelSegment } from "@workspace/api-client-react";
import botLogo from "/7dogs-logo.jpeg";

interface SpinningWheelProps {
  segments: WheelSegment[];
  isSpinning: boolean;
  landingSegmentId?: number;
  onSpinEnd: () => void;
}

export function SpinningWheel({ segments, isSpinning, landingSegmentId, onSpinEnd }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!isSpinning || landingSegmentId === undefined || segments.length === 0) return;

    const segmentIndex = segments.findIndex(s => s.id === landingSegmentId);
    if (segmentIndex === -1) return;

    const segmentAngle = 360 / segments.length;
    const targetAngle = 360 - (segmentIndex * segmentAngle) - (segmentAngle / 2);
    const extraSpins = 360 * 6;
    const newRotation = rotation + extraSpins + (targetAngle - (rotation % 360));

    setRotation(newRotation);

    const timeout = setTimeout(() => {
      onSpinEnd();
    }, 5500);

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, landingSegmentId, segments]);

  if (!segments || segments.length === 0) {
    return (
      <div className="w-full max-w-[310px] aspect-square mx-auto my-4 bg-card rounded-full animate-pulse border-4 border-primary/20" />
    );
  }

  const radius = 50;
  const center = 50;
  const totalSegments = segments.length;

  return (
    <div className="relative w-full max-w-[310px] aspect-square mx-auto my-4">
      {/* Glow behind wheel */}
      <div className="absolute inset-0 bg-primary/15 blur-[60px] rounded-full" />

      {/* Pointer */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-7 h-9 drop-shadow-[0_0_8px_rgba(212,175,55,0.9)]">
        <svg viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 30L24 10C24 4.47715 19.5228 0 14 0H10C4.47715 0 0 4.47715 0 10L12 30Z" fill="url(#goldGrad)" />
          <defs>
            <linearGradient id="goldGrad" x1="12" y1="0" x2="12" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE066" />
              <stop offset="0.5" stopColor="#D4AF37" />
              <stop offset="1" stopColor="#997A00" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Wheel container */}
      <div
        className="w-full h-full rounded-full border-[10px] border-primary relative overflow-hidden bg-[#0d0d0d] shadow-[0_0_40px_rgba(212,175,55,0.35)] transition-transform duration-[5500ms] ease-[cubic-bezier(0.17,0.67,0.12,1.0)]"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Inner border glow */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/30 z-10 pointer-events-none" />

        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <defs>
            {segments.map((_, i) => (
              <linearGradient key={`grad${i}`} id={`segGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={i % 2 === 0 ? "#1c1c1c" : "#141414"} />
                <stop offset="100%" stopColor={i % 2 === 0 ? "#111" : "#0a0a0a"} />
              </linearGradient>
            ))}
          </defs>

          {segments.map((segment, index) => {
            const angle = 360 / totalSegments;
            const startAngle = (index * angle * Math.PI) / 180;
            const endAngle = ((index + 1) * angle * Math.PI) / 180;

            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);

            const largeArcFlag = angle > 180 ? 1 : 0;
            const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            const textAngle = startAngle + (angle * Math.PI) / 360;
            const textRadius = radius * 0.68;
            const tx = center + textRadius * Math.cos(textAngle);
            const ty = center + textRadius * Math.sin(textAngle);

            return (
              <g key={segment.id}>
                <path
                  d={pathData}
                  fill={`url(#segGrad${index})`}
                  stroke="#D4AF37"
                  strokeWidth="0.6"
                />
                <g transform={`translate(${tx}, ${ty}) rotate(${(textAngle * 180 / Math.PI) + 90})`}>
                  <text
                    x="0"
                    y="-1.5"
                    fontSize="5"
                    fontWeight="900"
                    fill={segment.color || "#FFD700"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    letterSpacing="0.3"
                  >
                    {segment.label}
                  </text>
                  <text
                    x="0"
                    y="4"
                    fontSize="3.5"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#D4AF37"
                    opacity="0.85"
                  >
                    🐾
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Center: bot logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28%] h-[28%] rounded-full border-4 border-[#FFD700] z-20 overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.6),inset_0_0_10px_rgba(0,0,0,0.8)] bg-black">
          <img
            src={botLogo}
            alt="7DOGS"
            className="w-full h-full object-cover"
            style={{ transform: `rotate(${-rotation}deg)`, transition: `transform 5500ms cubic-bezier(0.17,0.67,0.12,1.0)` }}
          />
        </div>
      </div>
    </div>
  );
}
