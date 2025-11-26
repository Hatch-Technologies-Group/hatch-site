"use client";

import * as React from "react";
import type { PersonaId } from "@/lib/ai/aiPersonas";
import { PERSONA_COLORS, getPersonaConfig } from "@/lib/ai/aiPersonas";

type AiPersonaFaceProps = {
  personaId: PersonaId;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  active?: boolean;
  className?: string;
};

export const AiPersonaFace: React.FC<AiPersonaFaceProps> = ({
  personaId,
  size = "md",
  animated = true,
  active = false,
  className,
}) => {
  const baseSize = size === "sm" ? 28 : size === "lg" ? 56 : 40;
  const { color, accent } = PERSONA_COLORS[personaId];

  // Useful if we later show tooltips/names; not strictly required now.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const persona = getPersonaConfig(personaId);

  // Randomize blink and wander offsets per instance so faces don't sync
  const [blinkDelay] = React.useState(() => `${Math.random() * 5}s`);
  const [wanderDelay] = React.useState(() => `${Math.random() * 30}s`);

  const renderFace = () => {
    switch (personaId) {
      case "hatch_assistant": // Hatch – orchestrator
        return (
          <>
            <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="3" />
            <g className="ai-eyes">
              <circle className="ai-eye" cx="24" cy="28" r="3.2" fill="#000" />
              <circle className="ai-eye" cx="40" cy="28" r="3.2" fill="#000" />
            </g>
            <path d="M24 40 Q32 44 40 40" stroke={color} strokeWidth="3" strokeLinecap="round" />
            {/* Soft forehead band + badge to keep a unique identity without over-detailing */}
            <path d="M18 18 Q32 12 46 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="18" r="3" fill={accent} stroke={color} strokeWidth="1.5" />
            {/* Tiny mic dot to hint assistant role */}
            <circle cx="48" cy="34" r="2.2" fill={color} />
          </>
        );
      case "agent_copilot": // Echo – thinker
        return (
          <>
            <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="3" />
            <g className="ai-eyes">
              <circle className="ai-eye" cx="24" cy="28" r="3" fill="#000" />
              <circle className="ai-eye" cx="40" cy="28" r="3" fill="#000" />
            </g>
            <path d="M22 40 Q32 46 42 40" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            <circle cx="46" cy="20" r="4" fill={color} fillOpacity="0.7" />
          </>
        );
      case "lead_nurse": // Lumen – nurturer
        return (
          <>
            <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="3" />
            <g className="ai-eyes">
              <circle className="ai-eye" cx="24" cy="28" r="3" fill="#000" />
              <circle className="ai-eye" cx="40" cy="28" r="3" fill="#000" />
            </g>
            <path d="M22 38 Q32 48 42 38" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <path d="M14 20 L17 22 L14 24 Z" fill={color} />
            <path d="M50 20 L53 22 L50 24 Z" fill={color} />
          </>
        );
      case "listing_concierge": // Haven – creative
        return (
          <>
            <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="3" />
            <g className="ai-eyes">
              <circle className="ai-eye" cx="24" cy="28" r="3" fill="#000" />
              <circle className="ai-eye" cx="40" cy="28" r="3" fill="#000" />
            </g>
            <circle cx="32" cy="40" r="4" fill={color} fillOpacity="0.8" />
            <path d="M20 14 L32 8 L44 14" stroke={color} strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case "market_analyst": // Atlas – analyst
        return (
          <>
            <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="3" />
            <g className="ai-eyes">
              <circle className="ai-eye" cx="24" cy="28" r="3" fill="#000" />
              <circle className="ai-eye" cx="40" cy="28" r="3" fill="#000" />
            </g>
            <path d="M24 40 H40" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            <rect x="48" y="20" width="3" height="8" fill={color} />
            <rect x="53" y="17" width="3" height="11" fill={color} />
          </>
        );
      case "transaction_coordinator": // Nova – organizer
        return (
          <>
            <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="3" />
            <g className="ai-eyes">
              <circle className="ai-eye" cx="24" cy="28" r="3" fill="#000" />
              <circle className="ai-eye" cx="40" cy="28" r="3" fill="#000" />
            </g>
            <path d="M24 40 Q32 44 40 40" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <rect x="46" y="16" width="12" height="12" stroke={color} strokeWidth="2" fill="none" />
            <line x1="46" y1="22" x2="58" y2="22" stroke={color} strokeWidth="2" />
          </>
        );
      default:
        return (
          <>
            <circle cx="32" cy="32" r="30" stroke="#000" strokeWidth="3" />
            <circle cx="24" cy="28" r="3" fill="#000" />
            <circle cx="40" cy="28" r="3" fill="#000" />
          </>
        );
    }
  };

  const animationClass = animated
    ? active
      ? "animate-[bounce-subtle_2.5s_ease-in-out_infinite]"
      : "animate-[float-subtle_4s_ease-in-out_infinite]"
    : "";

  const svgClass = animated 
    ? active 
      ? "ai-blink ai-wander active" 
      : "ai-blink ai-wander" 
    : "";

  return (
    <div
      className={["relative inline-flex items-center justify-center rounded-full", animationClass, className]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: baseSize,
        height: baseSize,
        background: active ? `radial-gradient(circle at 30% 20%, ${accent}, #ffffff)` : "#ffffff",
        boxShadow: active
          ? `0 0 0 2px ${color}33, 0 8px 16px rgba(15,23,42,0.18)`
          : "0 4px 8px rgba(15,23,42,0.12)",
      }}
    >
      <svg
        width={baseSize - 6}
        height={baseSize - 6}
        viewBox="0 0 64 64"
        fill="none"
        className={svgClass}
        style={{ ['--blink-delay' as any]: blinkDelay, ['--wander-delay' as any]: wanderDelay }}
      >
        {renderFace()}
      </svg>
      {/* Inject lightweight keyframes for subtle motion + blink + eye wander */}
      <style>{`
        @keyframes float-subtle {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0px); }
        }
        @keyframes bounce-subtle {
          0% { transform: translateY(0px) scale(1); }
          30% { transform: translateY(-3px) scale(1.02); }
          60% { transform: translateY(1px) scale(0.99); }
          100% { transform: translateY(0px) scale(1); }
        }
        
        /* Smooth, realistic blinking animation */
        @keyframes blink-smooth { 
          0%, 100% { transform: scaleY(1); opacity: 1; }
          
          /* Single blink at 15% mark */
          15% { transform: scaleY(1); opacity: 1; }
          15.2% { transform: scaleY(0.9); opacity: 0.98; }
          15.4% { transform: scaleY(0.7); opacity: 0.96; }
          15.6% { transform: scaleY(0.5); opacity: 0.94; }
          15.8% { transform: scaleY(0.3); opacity: 0.92; }
          16% { transform: scaleY(0.15); opacity: 0.9; }
          16.2% { transform: scaleY(0.1); opacity: 0.9; }
          16.4% { transform: scaleY(0.15); opacity: 0.9; }
          16.6% { transform: scaleY(0.3); opacity: 0.92; }
          16.8% { transform: scaleY(0.5); opacity: 0.94; }
          17% { transform: scaleY(0.7); opacity: 0.96; }
          17.2% { transform: scaleY(0.9); opacity: 0.98; }
          17.4% { transform: scaleY(1); opacity: 1; }
          
          /* Stay open for a while, then ready for next cycle */
          18%, 99% { transform: scaleY(1); opacity: 1; }
        }
        
        /* Both eyes blink together smoothly, but each face has different timing */
        svg.ai-blink .ai-eye { 
          transform-origin: center;
          animation: blink-smooth 8s ease-in-out infinite var(--blink-delay, 0s);
        }
        
        /* Enhanced eye wander with smoother, more natural movements */
        @keyframes eye-wander {
          0%, 100% { transform: translate(0px, 0px); }
          
          /* Look up-right (thinking) */
          12% { transform: translate(0px, 0px); }
          15% { transform: translate(2.5px, -2px); }
          20% { transform: translate(2.5px, -2px); }
          
          /* Return to center */
          23% { transform: translate(0px, 0px); }
          
          /* Look down-right (reading) */
          35% { transform: translate(0px, 0px); }
          38% { transform: translate(3px, 1.5px); }
          44% { transform: translate(3px, 1.5px); }
          
          /* Return to center */
          47% { transform: translate(0px, 0px); }
          
          /* Quick glance left */
          58% { transform: translate(0px, 0px); }
          60% { transform: translate(-2.5px, 0px); }
          62% { transform: translate(-2.5px, 0px); }
          
          /* Back to center */
          65% { transform: translate(0px, 0px); }
          
          /* Look up-left (recalling) */
          75% { transform: translate(0px, 0px); }
          78% { transform: translate(-2px, -2.5px); }
          83% { transform: translate(-2px, -2.5px); }
          
          /* Return to center and hold */
          86% { transform: translate(0px, 0px); }
          95% { transform: translate(0px, 0px); }
        }
        
        svg.ai-wander .ai-eyes {
          transform-origin: center;
          animation: eye-wander 25s cubic-bezier(0.45, 0, 0.55, 1) infinite var(--wander-delay, 0s);
        }
      `}</style>
    </div>
  );
};
