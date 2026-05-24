import { useState, useEffect } from "react";
import { WheelSegment } from "@workspace/api-client-react/src/generated/api.schemas";
import { cn } from "@/lib/utils";

interface SpinningWheelProps {
  segments: WheelSegment[];
  isSpinning: boolean;
  landingSegmentId?: number;
  onSpinEnd: () => void;
}

export function SpinningWheel({ segments, isSpinning, landingSegmentId, onSpinEnd }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isSpinning && landingSegmentId !== undefined && segments.length > 0) {
      // Find the segment index
      const segmentIndex = segments.findIndex(s => s.id === landingSegmentId);
      if (segmentIndex === -1) return;

      const segmentAngle = 360 / segments.length;
      // Calculate angle to stop at the center of the winning segment
      const targetAngle = 360 - (segmentIndex * segmentAngle) - (segmentAngle / 2);
      
      // Add extra spins (e.g., 5 full rotations)
      const extraSpins = 360 * 5;
      const newRotation = rotation + extraSpins + (targetAngle - (rotation % 360));
      
      setRotation(newRotation);
      
      // Wait for animation to finish (5s)
      const timeout = setTimeout(() => {
        onSpinEnd();
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [isSpinning, landingSegmentId, segments]);

  if (!segments || segments.length === 0) {
    return <div className="w-full aspect-square bg-card rounded-full animate-pulse border-4 border-primary/20" />;
  }

  const radius = 50;
  const center = 50;

  return (
    <div className="relative w-full max-w-[320px] aspect-square mx-auto my-8">
      {/* Glow behind wheel */}
      <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full" />
      
      {/* The pointer */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-8 h-10 drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]">
        <svg viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 30L24 10C24 4.47715 19.5228 0 14 0H10C4.47715 0 0 4.47715 0 10L12 30Z" fill="url(#goldGradient)"/>
          <defs>
            <linearGradient id="goldGradient" x1="12" y1="0" x2="12" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE066" />
              <stop offset="0.5" stopColor="#D4AF37" />
              <stop offset="1" stopColor="#997A00" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* The wheel container */}
      <div 
        className="w-full h-full rounded-full border-8 border-primary relative overflow-hidden bg-[#111] shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-transform duration-[5000ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Border inner glow */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/40 z-10 pointer-events-none mix-blend-overlay" />
        
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((segment, index) => {
            const totalSegments = segments.length;
            const angle = 360 / totalSegments;
            const startAngle = (index * angle * Math.PI) / 180;
            const endAngle = ((index + 1) * angle * Math.PI) / 180;
            
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            
            const fillColor = index % 2 === 0 ? "#1a1a1a" : "#0a0a0a";
            
            // Text positioning
            const textAngle = startAngle + (angle * Math.PI) / 360;
            const textRadius = radius * 0.7;
            const tx = center + textRadius * Math.cos(textAngle);
            const ty = center + textRadius * Math.sin(textAngle);

            return (
              <g key={segment.id}>
                <path 
                  d={pathData} 
                  fill={fillColor} 
                  stroke="#D4AF37" 
                  strokeWidth="0.5" 
                />
                <g 
                  transform={`translate(${tx}, ${ty}) rotate(${(textAngle * 180 / Math.PI) + 90})`}
                >
                  <text 
                    x="0" 
                    y="0" 
                    fontSize="4" 
                    fontWeight="bold"
                    fill={segment.color || "#D4AF37"}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="gold-text-glow uppercase tracking-wider"
                  >
                    {segment.label}
                  </text>
                  {segment.rewardType === 'coins' && (
                    <text x="0" y="6" fontSize="4" textAnchor="middle" dominantBaseline="middle" fill="#D4AF37">🐾</text>
                  )}
                  {segment.rewardType === 'gift' && (
                    <text x="0" y="6" fontSize="4" textAnchor="middle" dominantBaseline="middle" fill="#D4AF37">🎁</text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>

        {/* Center button */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-background bg-gradient-to-br from-primary to-[#997A00] z-20 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.8)_inset]">
          <div className="text-background font-black text-sm flex flex-col items-center leading-none">
            <span>7DOGS</span>
            <span className="text-xl mt-0.5">🐾</span>
          </div>
        </div>
      </div>
    </div>
  );
}
