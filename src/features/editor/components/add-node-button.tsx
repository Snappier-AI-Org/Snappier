"use client";

import { PlusIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useAddNodePanel } from "./add-node-panel-context";

export const AddNodeButton = memo(() => {
  const { setIsOpen } = useAddNodePanel();

  return (
    <Button
      onClick={() => setIsOpen(true)}
      size="icon"
      variant="outline"
      className="bg-background"
    >
      <PlusIcon />
    </Button>
  );
});

AddNodeButton.displayName = "AddNodeButton";