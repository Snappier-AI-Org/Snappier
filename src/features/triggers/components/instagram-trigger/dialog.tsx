"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { X, MessageCircle, MessageSquare } from "lucide-react";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import { CredentialType } from "@/generated/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstagramPostSelector, type InstagramPost } from "@/features/meta/components/instagram-post-selector";
import type { InstagramTriggerNodeData, InstagramTriggerType } from "./node";

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

// Instagram Comment trigger variables
const INSTAGRAM_COMMENT_TRIGGER_VARIABLES = [
  {
    token: "{{instagramComment.commentId}}",
    label: "Comment ID",
    description: "Unique ID of the comment",
  },
  {
    token: "{{instagramComment.commentText}}",
    label: "Comment Text",
    description: "Content of the comment",
  },
  {
    token: "{{instagramComment.commenterUserId}}",
    label: "Commenter User ID",
    description: "Instagram user ID of the commenter",
  },
  {
    token: "{{instagramComment.commenterUsername}}",
    label: "Commenter Username",
    description: "Instagram username of the commenter",
  },
  {
    token: "{{instagramComment.postId}}",
    label: "Post ID",
    description: "ID of the post that was commented on",
  },
  {
    token: "{{instagramComment.timestamp}}",
    label: "Timestamp",
    description: "When the comment was posted",
  },
  {
    token: "{{instagramComment.parentCommentId}}",
    label: "Parent Comment ID",
    description: "ID of parent comment (if this is a reply)",
  },
  {
    token: "{{json instagramComment}}",
    label: "Full Comment JSON",
    description: "Complete comment object as JSON",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData?: InstagramTriggerNodeData;
  onNodeDataChange?: (data: InstagramTriggerNodeData) => void;
}

export const InstagramTriggerDialog = ({
  open,
  onOpenChange,
  nodeData,
  onNodeDataChange,
}: Props) => {
  const [selectedCredentialId, setSelectedCredentialId] = useState(
    nodeData?.credentialId || ""
  );
  const [triggerType, setTriggerType] = useState<InstagramTriggerType>(
    nodeData?.triggerType || "both"
  );
  
  // DM-specific state
  const [dmKeywords, setDmKeywords] = useState<string[]>(nodeData?.dmKeywords || []);
  const [dmKeywordMatchMode, setDmKeywordMatchMode] = useState<"any" | "all" | "exact">(
    nodeData?.dmKeywordMatchMode || "any"
  );
  const [dmKeywordInput, setDmKeywordInput] = useState("");
  
  // Comment-specific state
  const [postId, setPostId] = useState(nodeData?.postId || "");
  const [commentKeywords, setCommentKeywords] = useState<string[]>(nodeData?.commentKeywords || []);
  const [commentKeywordMatchMode, setCommentKeywordMatchMode] = useState<"any" | "all" | "exact">(
    nodeData?.commentKeywordMatchMode || "any"
  );
  const [commentKeywordInput, setCommentKeywordInput] = useState("");

  // Update local state when nodeData changes
  useEffect(() => {
    if (nodeData?.credentialId) {
      setSelectedCredentialId(nodeData.credentialId);
    }
    if (nodeData?.triggerType) {
      setTriggerType(nodeData.triggerType);
    }
    if (nodeData?.dmKeywords) {
      setDmKeywords(nodeData.dmKeywords);
    }
    if (nodeData?.dmKeywordMatchMode) {
      setDmKeywordMatchMode(nodeData.dmKeywordMatchMode);
    }
    if (nodeData?.postId !== undefined) {
      setPostId(nodeData.postId);
    }
    if (nodeData?.commentKeywords) {
      setCommentKeywords(nodeData.commentKeywords);
    }
    if (nodeData?.commentKeywordMatchMode) {
      setCommentKeywordMatchMode(nodeData.commentKeywordMatchMode);
    }
  }, [nodeData]);

  const handleCredentialChange = (credentialId: string) => {
    setSelectedCredentialId(credentialId);
    onNodeDataChange?.({ ...nodeData, credentialId });
  };

  const handleTriggerTypeChange = (type: InstagramTriggerType) => {
    setTriggerType(type);
    onNodeDataChange?.({ ...nodeData, triggerType: type });
  };

  // DM handlers
  const handleAddDmKeyword = () => {
    const trimmed = dmKeywordInput.trim();
    if (trimmed && !dmKeywords.includes(trimmed)) {
      const newKeywords = [...dmKeywords, trimmed];
      setDmKeywords(newKeywords);
      onNodeDataChange?.({ ...nodeData, dmKeywords: newKeywords });
      setDmKeywordInput("");
    }
  };

  const handleRemoveDmKeyword = (keyword: string) => {
    const newKeywords = dmKeywords.filter((k) => k !== keyword);
    setDmKeywords(newKeywords);
    onNodeDataChange?.({ ...nodeData, dmKeywords: newKeywords });
  };

  const handleDmKeywordMatchModeChange = (mode: "any" | "all" | "exact") => {
    setDmKeywordMatchMode(mode);
    onNodeDataChange?.({ ...nodeData, dmKeywordMatchMode: mode });
  };

  // Comment handlers
  const handlePostSelect = (post: InstagramPost | null) => {
    const newPostId = post?.id || "";
    setPostId(newPostId);
    onNodeDataChange?.({ ...nodeData, postId: newPostId });
  };

  const handleAddCommentKeyword = () => {
    const trimmed = commentKeywordInput.trim();
    if (trimmed && !commentKeywords.includes(trimmed)) {
      const newKeywords = [...commentKeywords, trimmed];
      setCommentKeywords(newKeywords);
      onNodeDataChange?.({ ...nodeData, commentKeywords: newKeywords });
      setCommentKeywordInput("");
    }
  };

  const handleRemoveCommentKeyword = (keyword: string) => {
    const newKeywords = commentKeywords.filter((k) => k !== keyword);
    setCommentKeywords(newKeywords);
    onNodeDataChange?.({ ...nodeData, commentKeywords: newKeywords });
  };

  const handleCommentKeywordMatchModeChange = (mode: "any" | "all" | "exact") => {
    setCommentKeywordMatchMode(mode);
    onNodeDataChange?.({ ...nodeData, commentKeywordMatchMode: mode });
  };

  const handleSave = () => {
    if (!selectedCredentialId) {
      toast.error("Please select an Instagram account");
      return;
    }

    // Build the complete configuration
    const configuration: InstagramTriggerNodeData = {
      credentialId: selectedCredentialId,
      triggerType,
      dmKeywords: triggerType === "dm" || triggerType === "both" ? dmKeywords : undefined,
      dmKeywordMatchMode: triggerType === "dm" || triggerType === "both" ? dmKeywordMatchMode : undefined,
      postId: triggerType === "comment" || triggerType === "both" ? postId : undefined,
      commentKeywords: triggerType === "comment" || triggerType === "both" ? commentKeywords : undefined,
      commentKeywordMatchMode: triggerType === "comment" || triggerType === "both" ? commentKeywordMatchMode : undefined,
    };

    // Update node data
    onNodeDataChange?.(configuration);
    toast.success("Instagram trigger configuration saved");
    onOpenChange(false);
  };

  const showDmSection = triggerType === "dm" || triggerType === "both";
  const showCommentSection = triggerType === "comment" || triggerType === "both";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Instagram Trigger Configuration</DialogTitle>
          <DialogDescription>
            Configure this trigger to run your workflow when Instagram events occur.
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

          {/* Trigger Type Selection */}
          <div className="space-y-2">
            <Label>Trigger On</Label>
            <Select
              value={triggerType}
              onValueChange={(v) => handleTriggerTypeChange(v as InstagramTriggerType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dm">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Direct Messages Only
                  </div>
                </SelectItem>
                <SelectItem value="comment">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments Only
                  </div>
                </SelectItem>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <MessageSquare className="h-4 w-4" />
                    Both DMs and Comments
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose whether to trigger on DMs, comments, or both types of events.
            </p>
          </div>

          {/* Conditional Sections based on trigger type */}
          {(showDmSection || showCommentSection) && (
            <Tabs defaultValue={showDmSection ? "dm" : "comment"} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${(showDmSection ? 1 : 0) + (showCommentSection ? 1 : 0)}, 1fr)` }}>
                {showDmSection && (
                  <TabsTrigger value="dm" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    DM Settings
                  </TabsTrigger>
                )}
                {showCommentSection && (
                  <TabsTrigger value="comment" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comment Settings
                  </TabsTrigger>
                )}
              </TabsList>

              {/* DM Settings Tab */}
              {showDmSection && (
                <TabsContent value="dm" className="space-y-4 mt-4">
                  {/* DM Keyword Filters */}
                  <div className="space-y-2">
                    <Label>Keyword Filters (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Only trigger when messages contain specific keywords. Leave empty to
                      trigger on all messages.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={dmKeywordInput}
                        onChange={(e) => setDmKeywordInput(e.target.value)}
                        placeholder="Add keyword..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDmKeyword();
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" onClick={handleAddDmKeyword}>
                        Add
                      </Button>
                    </div>
                    {dmKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {dmKeywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="gap-1">
                            {keyword}
                            <button
                              type="button"
                              onClick={() => handleRemoveDmKeyword(keyword)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DM Match Mode */}
                  {dmKeywords.length > 0 && (
                    <div className="space-y-2">
                      <Label>Match Mode</Label>
                      <Select
                        value={dmKeywordMatchMode}
                        onValueChange={(v) =>
                          handleDmKeywordMatchModeChange(v as "any" | "all" | "exact")
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

                  {/* DM Available Variables */}
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <h4 className="font-medium text-sm">Available DM Data</h4>
                    <p className="text-xs text-muted-foreground">
                      When a DM is received, you can access this data in subsequent nodes:
                    </p>
                    <VariableTokenList variables={INSTAGRAM_DM_TRIGGER_VARIABLES} />
                  </div>
                </TabsContent>
              )}

              {/* Comment Settings Tab */}
              {showCommentSection && (
                <TabsContent value="comment" className="space-y-4 mt-4">
                  {/* Post Selection */}
                  <div className="space-y-2">
                    <Label>Post (Optional)</Label>
                    <InstagramPostSelector
                      credentialId={selectedCredentialId}
                      selectedPostId={postId}
                      onPostSelect={handlePostSelect}
                    />
                    <p className="text-xs text-muted-foreground">
                      Only trigger on comments for a specific post. Leave empty to trigger
                      on all post comments.
                    </p>
                  </div>

                  {/* Comment Keyword Filters */}
                  <div className="space-y-2">
                    <Label>Keyword Filters (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Only trigger when comments contain specific keywords. Leave empty to
                      trigger on all comments.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={commentKeywordInput}
                        onChange={(e) => setCommentKeywordInput(e.target.value)}
                        placeholder="Add keyword..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCommentKeyword();
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" onClick={handleAddCommentKeyword}>
                        Add
                      </Button>
                    </div>
                    {commentKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {commentKeywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="gap-1">
                            {keyword}
                            <button
                              type="button"
                              onClick={() => handleRemoveCommentKeyword(keyword)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comment Match Mode */}
                  {commentKeywords.length > 0 && (
                    <div className="space-y-2">
                      <Label>Match Mode</Label>
                      <Select
                        value={commentKeywordMatchMode}
                        onValueChange={(v) =>
                          handleCommentKeywordMatchModeChange(v as "any" | "all" | "exact")
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

                  {/* Comment Available Variables */}
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <h4 className="font-medium text-sm">Available Comment Data</h4>
                    <p className="text-xs text-muted-foreground">
                      When a comment is posted, you can access this data in subsequent nodes:
                    </p>
                    <VariableTokenList variables={INSTAGRAM_COMMENT_TRIGGER_VARIABLES} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            onClick={handleSave}
            disabled={!selectedCredentialId}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
