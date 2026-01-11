"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import { CredentialType } from "@/generated/prisma";

const DISCORD_TRIGGER_VARIABLES = [
  { token: "{{discordMessage.content}}", label: "Message Content" },
  { token: "{{discordMessage.messageId}}", label: "Message ID" },
  { token: "{{discordMessage.channelId}}", label: "Channel ID" },
  { token: "{{discordMessage.guildId}}", label: "Guild ID" },
  { token: "{{discordMessage.authorId}}", label: "Author ID" },
  { token: "{{discordMessage.authorUsername}}", label: "Author Username" },
  { token: "{{discordMessage.isBot}}", label: "Is Bot" },
  { token: "{{discordMessage.isDM}}", label: "Is DM" },
  { token: "{{discordMessage.timestamp}}", label: "Timestamp" },
  { token: "{{json discordMessage}}", label: "Full Payload JSON" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData?: {
    credentialId?: string;
    channelId?: string;
    guildId?: string;
    listenToDMs?: boolean;
    keywordFilters?: string[];
    keywordMatchMode?: "any" | "all" | "exact";
    includeBots?: boolean;
  };
  onNodeDataChange?: (data: {
    credentialId?: string;
    channelId?: string;
    guildId?: string;
    listenToDMs?: boolean;
    keywordFilters?: string[];
    keywordMatchMode?: "any" | "all" | "exact";
    includeBots?: boolean;
  }) => void;
}

export const DiscordTriggerDialog = ({
  open,
  onOpenChange,
  nodeData,
  onNodeDataChange,
}: Props) => {
  const [credentialId, setCredentialId] = useState(
    nodeData?.credentialId || "",
  );
  const [channelId, setChannelId] = useState(nodeData?.channelId || "");
  const [guildId, setGuildId] = useState(nodeData?.guildId || "");
  const [listenToDMs, setListenToDMs] = useState(nodeData?.listenToDMs ?? true);
  const [includeBots, setIncludeBots] = useState(
    nodeData?.includeBots ?? false,
  );
  const [keywordFilters, setKeywordFilters] = useState<string[]>(
    nodeData?.keywordFilters || [],
  );
  const [keywordMatchMode, setKeywordMatchMode] = useState<
    "any" | "all" | "exact"
  >(nodeData?.keywordMatchMode || "any");
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    setCredentialId(nodeData?.credentialId || "");
    setChannelId(nodeData?.channelId || "");
    setGuildId(nodeData?.guildId || "");
    setListenToDMs(nodeData?.listenToDMs ?? true);
    setIncludeBots(nodeData?.includeBots ?? false);
    setKeywordFilters(nodeData?.keywordFilters || []);
    setKeywordMatchMode(nodeData?.keywordMatchMode || "any");
  }, [
    nodeData?.credentialId,
    nodeData?.channelId,
    nodeData?.guildId,
    nodeData?.listenToDMs,
    nodeData?.includeBots,
    nodeData?.keywordFilters,
    nodeData?.keywordMatchMode,
  ]);

  const updateNodeData = (data: Partial<NonNullable<Props["nodeData"]>>) => {
    onNodeDataChange?.({
      credentialId,
      channelId,
      guildId,
      listenToDMs,
      includeBots,
      keywordFilters,
      keywordMatchMode,
      ...data,
    });
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywordFilters.includes(trimmed)) {
      const updated = [...keywordFilters, trimmed];
      setKeywordFilters(updated);
      updateNodeData({ keywordFilters: updated });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const updated = keywordFilters.filter((k) => k !== keyword);
    setKeywordFilters(updated);
    updateNodeData({ keywordFilters: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Discord Trigger Configuration</DialogTitle>
          <DialogDescription>
            Run this workflow whenever your Discord bot receives a message that
            matches these filters.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Credential Selection - Required */}
          <div className="space-y-2">
            <Label htmlFor="credential">
              Discord Bot <span className="text-destructive">*</span>
            </Label>
            <CredentialSelect
              type={CredentialType.DISCORD}
              value={credentialId}
              onChange={(value) => {
                setCredentialId(value);
                updateNodeData({ credentialId: value });
              }}
              placeholder="Select a Discord bot"
            />
            <p className="text-xs text-muted-foreground">
              Select the Discord bot account that will listen for messages.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channelId">Channel ID (optional)</Label>
            <Input
              id="channelId"
              placeholder="e.g. 123456789012345678"
              value={channelId}
              onChange={(e) => {
                setChannelId(e.target.value);
                updateNodeData({ channelId: e.target.value });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to listen to all channels in the selected guild.
            </p>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                How to get Channel ID
              </summary>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>
                  Enable Developer Mode in Discord (User Settings → Advanced →
                  Developer Mode)
                </li>
                <li>Right-click on any channel</li>
                <li>Click "Copy Channel ID"</li>
              </ol>
            </details>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guildId">Guild ID (optional)</Label>
            <Input
              id="guildId"
              placeholder="e.g. 987654321098765432"
              value={guildId}
              onChange={(e) => {
                setGuildId(e.target.value);
                updateNodeData({ guildId: e.target.value });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Provide to scope to a single server. Leave empty to allow any
              guild.
            </p>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                How to get Guild ID (Server ID)
              </summary>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>
                  Enable Developer Mode in Discord (User Settings → Advanced →
                  Developer Mode)
                </li>
                <li>Right-click on the server icon</li>
                <li>Click "Copy Server ID"</li>
              </ol>
            </details>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Listen to Direct Messages</Label>
              <p className="text-xs text-muted-foreground">
                Allow the bot to trigger when users DM it directly.
              </p>
            </div>
            <Switch
              checked={listenToDMs}
              onCheckedChange={(checked) => {
                setListenToDMs(checked);
                updateNodeData({ listenToDMs: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Include bot messages</Label>
              <p className="text-xs text-muted-foreground">
                Enable if you want to react to messages sent by bots.
              </p>
            </div>
            <Switch
              checked={includeBots}
              onCheckedChange={(checked) => {
                setIncludeBots(checked);
                updateNodeData({ includeBots: checked });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Keyword filters (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Only trigger when the message content matches these keywords.
              Leave empty to trigger on all messages.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddKeyword}
              >
                Add
              </Button>
            </div>
            {keywordFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywordFilters.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1">
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {keywordFilters.length > 0 && (
            <div className="space-y-2">
              <Label>Keyword match mode</Label>
              <Select
                value={keywordMatchMode}
                onValueChange={(value) => {
                  const mode = value as "any" | "all" | "exact";
                  setKeywordMatchMode(mode);
                  updateNodeData({ keywordMatchMode: mode });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Match any keyword</SelectItem>
                  <SelectItem value="all">Match all keywords</SelectItem>
                  <SelectItem value="exact">Exact match</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Available variables</Label>
            <VariableTokenList variables={DISCORD_TRIGGER_VARIABLES} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
