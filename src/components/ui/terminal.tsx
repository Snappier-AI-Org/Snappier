"use client";

import { cn } from "@/lib/utils";

interface TerminalProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Terminal({ children, title = "terminal", className }: TerminalProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-cyber-stroke bg-black/90 backdrop-blur-sm overflow-hidden font-mono",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-cyber-stroke bg-cyber-surface/50">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
          <div className="size-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
          <div className="size-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
        </div>
        <span className="text-xs text-cyber-text-tertiary ml-2">{title}</span>
      </div>
      <div className="p-4 text-sm text-green-400 overflow-auto">{children}</div>
    </div>
  );
}

interface TerminalLineProps {
  prompt?: string;
  command?: string;
  output?: string;
  className?: string;
}

export function TerminalLine({
  prompt = "$",
  command,
  output,
  className,
}: TerminalLineProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {command && (
        <div className="flex items-center gap-2">
          <span className="text-cyber-accent">{prompt}</span>
          <span className="text-cyber-text-primary typing-animation">{command}</span>
        </div>
      )}
      {output && <div className="text-cyber-text-secondary pl-4">{output}</div>}
    </div>
  );
}

interface TerminalOutputProps {
  lines: string[];
  className?: string;
}

export function TerminalOutput({ lines, className }: TerminalOutputProps) {
  return (
    <div className={cn("space-y-0.5", className)}>
      {lines.map((line, index) => (
        <div key={index} className="text-green-400/90">
          {line}
        </div>
      ))}
    </div>
  );
}

interface TerminalLogProps {
  timestamp?: string;
  level?: "info" | "warn" | "error" | "success" | "debug";
  message: string;
  className?: string;
}

export function TerminalLog({
  timestamp,
  level = "info",
  message,
  className,
}: TerminalLogProps) {
  const levelColors = {
    info: "text-blue-400",
    warn: "text-yellow-400",
    error: "text-red-400",
    success: "text-green-400",
    debug: "text-purple-400",
  };

  const levelLabels = {
    info: "INFO",
    warn: "WARN",
    error: "ERROR",
    success: "SUCCESS",
    debug: "DEBUG",
  };

  return (
    <div className={cn("flex items-start gap-2 font-mono text-xs", className)}>
      {timestamp && (
        <span className="text-cyber-text-tertiary shrink-0">[{timestamp}]</span>
      )}
      <span className={cn("shrink-0 font-semibold", levelColors[level])}>
        [{levelLabels[level]}]
      </span>
      <span className="text-cyber-text-secondary">{message}</span>
    </div>
  );
}
