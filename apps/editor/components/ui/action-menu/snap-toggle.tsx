"use client";

import useEditor from "@/store/use-editor";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/primitives/tooltip";
import { Magnet } from "lucide-react";
import { cn } from "@/lib/utils";

export function SnapToggle() {
  const snapEnabled = useEditor((s) => s.snapEnabled);
  const snapSize = useEditor((s) => s.snapSize);
  const setSnapEnabled = useEditor((s) => s.setSnapEnabled);
  const setSnapSize = useEditor((s) => s.setSnapSize);

  return (
    <div className="flex items-center gap-0.5">
      {/* Snap ein/aus */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={cn(
              "flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium transition-colors",
              snapEnabled
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Magnet className={cn("h-3.5 w-3.5", !snapEnabled && "opacity-40")} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{snapEnabled ? "Snap deaktivieren" : "Snap aktivieren"}</TooltipContent>
      </Tooltip>

      {/* Snap-Größe */}
      {snapEnabled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSnapSize(snapSize === 0.5 ? 0.25 : 0.5)}
              className="flex h-8 items-center rounded-lg px-2 text-xs font-mono text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {snapSize === 0.5 ? "50cm" : "25cm"}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Raster: {snapSize === 0.5 ? "50cm → auf 25cm wechseln" : "25cm → auf 50cm wechseln"}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
