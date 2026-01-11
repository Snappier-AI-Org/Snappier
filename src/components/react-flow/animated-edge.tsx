"use client";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { memo, useMemo } from "react";

export type AnimatedEdgeData = {
  animated?: boolean;
  flowSpeed?: "slow" | "normal" | "fast";
  flowDirection?: "forward" | "reverse";
};

type AnimatedEdgeType = Edge<AnimatedEdgeData>;

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
    selected,
    data,
  }: EdgeProps<AnimatedEdgeType>) => {
    
    // Check if this edge should be animated (during execution)
    const isAnimated = data?.animated === true;
    
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.25,
    });

    const pathLength = useMemo(() => {
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      return Math.sqrt(dx * dx + dy * dy) * 1.2;
    }, [sourceX, sourceY, targetX, targetY]);

    // ZOOM animation - single dash flying across
    const animDuration = useMemo(() => {
      const speed = data?.flowSpeed || "normal";
      // Quick zoom speed
      const baseSpeed = speed === "slow" ? 0.5 : speed === "fast" ? 0.2 : 0.3;
      return baseSpeed;
    }, [data?.flowSpeed]);

    // Single dash - one bright line zooming across
    // The dash is short, the gap is the entire path length so only one appears
    const dashLength = 20;
    const gapLength = pathLength;

    return (
      <g className="animated-edge-group">
        {/* Glow layer - enhanced when animated */}
        <path
          d={edgePath}
          fill="none"
          stroke="var(--snap-primary, #22C55E)"
          strokeWidth={isAnimated ? 10 : selected ? 6 : 4}
          strokeLinecap="round"
          opacity={isAnimated ? 0.3 : selected ? 0.15 : 0.05}
          style={{ filter: isAnimated ? "blur(6px)" : "blur(4px)" }}
        />
        
        {/* Main edge line - base tendril */}
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            stroke: isAnimated 
              ? "var(--snap-active, #4ADE80)" 
              : selected 
                ? "var(--snap-primary, #22C55E)" 
                : "var(--tendril-color, #64748B)",
            strokeWidth: 2,
            strokeLinecap: "round",
            transition: "stroke 0.3s ease",
          }}
        />
        
        {/* Single ZOOM dash - one line flying across */}
        {isAnimated && (
          <>
            {/* The zooming dash */}
            <path
              d={edgePath}
              fill="none"
              stroke="url(#zoomGradient)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${gapLength}`}
            >
              <animate
                attributeName="stroke-dashoffset"
                from={gapLength + dashLength}
                to={0}
                dur={`${animDuration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </path>
            
            {/* Gradient definition for the zoom effect */}
            <defs>
              <linearGradient id="zoomGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--snap-accent, #86EFAC)" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--snap-accent, #86EFAC)" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            
            {/* Bright core of the zoom */}
            <path
              d={edgePath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={`${dashLength * 0.6} ${gapLength}`}
            >
              <animate
                attributeName="stroke-dashoffset"
                from={gapLength + dashLength}
                to={0}
                dur={`${animDuration}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </path>
          </>
        )}
        
        {/* Selection highlight */}
        {selected && !isAnimated && (
          <path
            d={edgePath}
            fill="none"
            stroke="var(--snap-primary, #22C55E)"
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.2}
            style={{ filter: "blur(2px)" }}
          />
        )}
      </g>
    );
  }
);

AnimatedEdge.displayName = "AnimatedEdge";
