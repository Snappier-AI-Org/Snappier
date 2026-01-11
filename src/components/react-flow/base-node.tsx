import { forwardRef, type ComponentProps, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { NodeStatus } from "./node-status-indicator";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";

interface BaseNodeProps extends 
HTMLAttributes<HTMLDivElement> {
  status?: NodeStatus;
}
export const BaseNode = forwardRef<
HTMLDivElement, 
BaseNodeProps
>(({ className, status, ...props }, ref) => {
  return (
    <div
      ref={ref}
      id="base-node"
      className={cn(
        "bg-card text-card-foreground relative rounded-[18px] hover:bg-accent transition-all duration-300",
        // Pebble node styling with soft landing animation
        "animate-in fade-in zoom-in-95 duration-300",
        // Default border - more visible with primary color (for initial state or no status)
        (!status || status === "initial") && "border-2 border-primary/30 shadow-md dark:border-primary/20",
        // Status-based borders - border matches node size, no external glow
        status === "loading" && "border-2 border-blue-500 shadow-blue-500/20 shadow-md",
        status === "success" && "border-2 border-green-500 shadow-green-500/20 shadow-md",
        status === "error" && "border-2 border-red-500 shadow-red-500/20 shadow-md",
        className,
      )}
      tabIndex={0}
      {...props}
    >
      {props.children}
      {status === "error" && (
        <XCircleIcon className="absolute right-1 bottom-1 size-3 text-red-600 stroke-[2.5]"/>
      )}
      {status === "success" && (
        <CheckCircle2Icon className="absolute right-1 bottom-1 size-3 text-green-600 stroke-[2.5]"/>
      )}
      {status === "loading" && (
        <Loader2Icon className="absolute right-1 bottom-1 size-3 text-blue-600 stroke-[2.5] animate-spin"/>
      )}
    </div>
  );
}); 

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export function BaseNodeHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header
      {...props}
      className={cn(
        "mx-0 my-0 -mb-1 flex flex-row items-center justify-between gap-2 px-3 py-2",
        // Remove or modify these classes if you modify the padding in the
        // `<BaseNode />` component.
        className,
      )}
    />
  );
}

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export function BaseNodeHeaderTitle({
  className,
  ...props
}: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="base-node-title"
      className={cn("user-select-none flex-1 font-semibold", className)}
      {...props}
    />
  );
}

export function BaseNodeContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-content"
      className={cn("flex flex-col gap-y-2 p-3", className)}
      {...props}
    />
  );
}

export function BaseNodeFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-footer"
      className={cn(
        "flex flex-col items-center gap-y-2 border-t px-3 pt-2 pb-3",
        className,
      )}
      {...props}
    />
  );
}
