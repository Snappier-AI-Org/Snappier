"use client";

import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export type AnimatedEdgeData = {
  animated?: boolean;
  flowSpeed?: "slow" | "normal" | "fast";
  flowDirection?: "forward" | "reverse";
};

type AnimatedEdgeType = Edge<AnimatedEdgeData>;

/**
 * A custom edge component with flowing particle animation
 * The animation creates a "data flowing through pipes" effect
 * perfect for the ChatToFlow deep-tech/ocean abyss theme
 */
export const AnimatedEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected,
  }: EdgeProps<AnimatedEdgeType>) => {
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const isAnimated = data?.animated ?? false;
    const flowSpeed = data?.flowSpeed ?? "normal";
    const flowDirection = data?.flowDirection ?? "forward";

    // Calculate animation duration based on speed
    const speedDurations: Record<string, string> = {
      slow: "3s",
      normal: "1.5s",
      fast: "0.8s",
    };

    const animationDuration = speedDurations[flowSpeed] ?? "1.5s";
    const animationDirection = flowDirection === "reverse" ? "reverse" : "normal";

    return (
      <>
        {/* Background glow layer for animated edges */}
        {isAnimated && (
          <path
            className="animated-edge-glow"
            d={edgePath}
            fill="none"
            strokeWidth={8}
            style={{
              stroke: "url(#edge-glow-gradient)",
              opacity: 0.4,
              filter: "blur(4px)",
            }}
          />
        )}

        {/* Main edge path with gradient */}
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeWidth: isAnimated ? 2.5 : 2,
            stroke: isAnimated
              ? "url(#animated-edge-gradient)"
              : "url(#default-edge-gradient)",
          }}
          className={cn(
            "transition-all duration-300",
            isAnimated && "animated-edge-active",
            selected && "edge-selected"
          )}
        />

        {/* Flowing particles overlay - creates the "flowing" effect */}
        {isAnimated && (
          <>
            {/* Primary flow particles */}
            <path
              d={edgePath}
              fill="none"
              strokeWidth={3}
              className="flow-particles"
              style={{
                stroke: "url(#flow-particle-gradient)",
                strokeDasharray: "8 16",
                strokeLinecap: "round",
                animation: `flowAnimation ${animationDuration} linear infinite`,
                animationDirection,
              }}
            />
            {/* Secondary glow particles - offset for depth effect */}
            <path
              d={edgePath}
              fill="none"
              strokeWidth={2}
              className="flow-particles-glow"
              style={{
                stroke: "url(#flow-particle-glow-gradient)",
                strokeDasharray: "4 20",
                strokeLinecap: "round",
                animation: `flowAnimation ${animationDuration} linear infinite`,
                animationDirection,
                animationDelay: "-0.5s",
              }}
            />
          </>
        )}

        {/* SVG Definitions for gradients */}
        <defs>
          {/* Default edge gradient - subtle blue */}
          <linearGradient id="default-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--edge-color-start, rgba(92, 112, 234, 0.6))" />
            <stop offset="100%" stopColor="var(--edge-color-end, rgba(55, 174, 226, 0.6))" />
          </linearGradient>

          {/* Animated edge gradient - vibrant flowing colors */}
          <linearGradient id="animated-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--flow-color-start, #0021F3)" />
            <stop offset="50%" stopColor="var(--flow-color-mid, #5C70EA)" />
            <stop offset="100%" stopColor="var(--flow-color-end, #37AEE2)" />
          </linearGradient>

          {/* Glow gradient for animated edges */}
          <linearGradient id="edge-glow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 33, 243, 0.5)" />
            <stop offset="50%" stopColor="rgba(92, 112, 234, 0.6)" />
            <stop offset="100%" stopColor="rgba(55, 174, 226, 0.5)" />
          </linearGradient>

          {/* Flow particle gradient - the actual flowing bits */}
          <linearGradient id="flow-particle-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="50%" stopColor="rgba(55, 174, 226, 1)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.9)" />
          </linearGradient>

          {/* Secondary particle glow */}
          <linearGradient id="flow-particle-glow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(92, 112, 234, 0.8)" />
            <stop offset="100%" stopColor="rgba(0, 33, 243, 0.8)" />
          </linearGradient>
        </defs>
      </>
    );
  }
);

AnimatedEdge.displayName = "AnimatedEdge";
