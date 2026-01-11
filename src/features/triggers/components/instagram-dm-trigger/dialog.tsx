"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import { CredentialType } from "@/generated/prisma";

// Instagram DM trigger variables
const INSTAGRAM_DM_TRIGGER_VARIABLES = [
  {
    token: "{{instagramDM.senderId}}",
    label: "Sender ID",
    description: "Instagram user ID of the sender",
  },
  {
    token: "{{instagramDM.senderUsername}}",
    label: "Sender Username",
    description: "Instagram username of the sender",
  },
  {
    token: "{{instagramDM.messageText}}",
    label: "Message Text",
    description: "Content of the direct message",
  },
  {
    token: "{{instagramDM.messageId}}",
    label: "Message ID",
    description: "Unique ID of the message",
  },
  {
    token: "{{instagramDM.timestamp}}",
    label: "Timestamp",
    description: "When the message was sent",
  },
  {
    token: "{{instagramDM.conversationId}}",
    label: "Conversation ID",
    description: "Thread/conversation identifier",
  },
  {
    token: "{{json instagramDM}}",
    label: "Full DM JSON",
    description: "Complete DM object as JSON",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData?: {
    credentialId?: string;
    keywords?: string[];
    keywordMatchMode?: "any" | "all" | "exact";
  };
  onNodeDataChange?: (data: {
    credentialId?: string;
    keywords?: string[];
    keywordMatchMode?: "any" | "all" | "exact";
  }) => void;
}

export const InstagramDmTriggerDialog = ({
  open,
  onOpenChange,
  nodeData,
  onNodeDataChange,
}: Props) => {
  const [selectedCredentialId, setSelectedCredentialId] = useState(
    nodeData?.credentialId || ""
  );
  const [keywords, setKeywords] = useState<string[]>(nodeData?.keywords || []);
  const [keywordMatchMode, setKeywordMatchMode] = useState<"any" | "all" | "exact">(
    nodeData?.keywordMatchMode || "any"
  );
  const [keywordInput, setKeywordInput] = useState("");

  // Update local state when nodeData changes
  useEffect(() => {
    if (nodeData?.credentialId) {
      setSelectedCredentialId(nodeData.credentialId);
    }
    if (nodeData?.keywords) {
      setKeywords(nodeData.keywords);
    }
    if (nodeData?.keywordMatchMode) {
      setKeywordMatchMode(nodeData.keywordMatchMode);
    }
  }, [nodeData?.credentialId, nodeData?.keywords, nodeData?.keywordMatchMode]);

  const handleCredentialChange = (credentialId: string) => {
    setSelectedCredentialId(credentialId);
    onNodeDataChange?.({ ...nodeData, credentialId });
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      const newKeywords = [...keywords, trimmed];
      setKeywords(newKeywords);
      onNodeDataChange?.({ ...nodeData, keywords: newKeywords });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const newKeywords = keywords.filter((k) => k !== keyword);
    setKeywords(newKeywords);
    onNodeDataChange?.({ ...nodeData, keywords: newKeywords });
  };

  const handleKeywordMatchModeChange = (mode: "any" | "all" | "exact") => {
    setKeywordMatchMode(mode);
    onNodeDataChange?.({ ...nodeData, keywordMatchMode: mode });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Instagram DM Trigger Configuration</DialogTitle>
          <DialogDescription>
            Configure this trigger to run your workflow when an Instagram DM is
            received.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-6">
          {/* Credential Selection */}
          <div className="space-y-2">
            <Label htmlFor="credential">Instagram Account</Label>
            <CredentialSelect
              type={CredentialType.META_INSTAGRAM}
              value={selectedCredentialId}
              onChange={handleCredentialChange}
              placeholder="Select an Instagram account"
            />
          </div>

          {/* Keyword Filters */}
          <div className="space-y-2">
            <Label>Keyword Filters (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              Only trigger when messages contain specific keywords. Leave empty to
              trigger on all messages.
            </p>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add keyword..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddKeyword}>
                Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Match Mode */}
          {keywords.length > 0 && (
            <div className="space-y-2">
              <Label>Match Mode</Label>
              <Select
                value={keywordMatchMode}
                onValueChange={(v) =>
                  handleKeywordMatchModeChange(v as "any" | "all" | "exact")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Match any keyword</SelectItem>
                  <SelectItem value="all">Match all keywords</SelectItem>
                  <SelectItem value="exact">Exact match only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Available Variables */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h4 className="font-medium text-sm">Available Data</h4>
            <p className="text-xs text-muted-foreground">
              When a DM is received, you can access this data in subsequent nodes:
            </p>
            <VariableTokenList variables={INSTAGRAM_DM_TRIGGER_VARIABLES} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

