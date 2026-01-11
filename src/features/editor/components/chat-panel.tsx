"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { createId } from "@paralleldrive/cuid2";
import { useCallback, useEffect, useRef, memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send, Loader2, Trash2 } from "lucide-react";
import { NodeType } from "@/generated/prisma";
import { toast } from "sonner";
import { useAtomValue } from "jotai";
import { editorAtom } from "../store/atoms";
import { useWorkflowId } from "../context/workflow-context";
import { calculateNodePosition } from "../utils/node-layout";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isTriggerNode } from "../utils/node-registry";

// Action marker patterns
const ACTION_PATTERN = /\[ACTION:ADD_NODE:(\w+)\]/g;
const CONNECT_PATTERN = /\[ACTION:CONNECT_NODES:([^:]+):([^\]]+)\]/g;
const CONFIGURE_PATTERN = /\[ACTION:CONFIGURE_NODE:([^:]+):(\{[^}]+\})\]/g;

// Helper function to extract text content from UIMessage
function getMessageContent(message: UIMessage): string {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text || "")
      .join("");
  }
  return "";
}

export const ChatPanel = memo(function ChatPanel() {
  const workflowId = useWorkflowId();
  const editor = useAtomValue(editorAtom);

  // Get current workflow state
  const getWorkflowState = useCallback(() => {
    if (!editor) return { nodes: [], edges: [] };
    return {
      nodes: editor.getNodes().map((node) => ({
        id: node.id,
        type: node.type,
        data: node.data,
      })),
      edges: editor.getEdges().map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    };
  }, [editor]);

  // Custom fetch to include workflow state
  const customFetch = useCallback(
    async (input: RequestInfo | URL, options: RequestInit = {}) => {
      const workflowState = getWorkflowState();
      const body = options.body ? JSON.parse(options.body as string) : {};

      return fetch(input, {
        ...options,
        body: JSON.stringify({ ...body, workflowId, workflowState }),
        headers: { ...options.headers, "Content-Type": "application/json" },
      });
    },
    [workflowId, getWorkflowState]
  );

  const chatHook = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: customFetch,
    }),
  });

  const { messages, sendMessage, status, error, setMessages } = chatHook;
  const isLoading = status === "streaming" || status === "submitted";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const lastCreatedNodeIdsRef = useRef<string[]>([]);
  const hasLoadedMessagesRef = useRef(false);
  const lastSavedMessageCountRef = useRef(0);

  // tRPC for chat persistence
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: savedMessages, isLoading: isLoadingMessages } = useQuery({
    ...trpc.chat.getMessages.queryOptions({ workflowId }),
    enabled: !!workflowId,
  });

  const saveMessageMutation = useMutation(trpc.chat.saveMessage.mutationOptions({}));
  const clearMessagesMutation = useMutation(
    trpc.chat.clearMessages.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.chat.getMessages.queryOptions({ workflowId })),
    })
  );

  // Load saved messages
  useEffect(() => {
    if (savedMessages && savedMessages.length > 0 && !hasLoadedMessagesRef.current) {
      hasLoadedMessagesRef.current = true;
      const uiMessages: UIMessage[] = savedMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        parts: msg.parts ? (msg.parts as UIMessage["parts"]) : [{ type: "text" as const, text: msg.content }],
        createdAt: msg.createdAt,
      }));
      uiMessages.forEach((msg) => processedMessagesRef.current.add(msg.id));
      setMessages(uiMessages);
      lastSavedMessageCountRef.current = uiMessages.length;
    }
  }, [savedMessages, setMessages]);

  // Save new messages
  useEffect(() => {
    if (isLoading || !workflowId || messages.length === 0) return;
    const newMessages = messages.slice(lastSavedMessageCountRef.current);
    newMessages.forEach((msg) => {
      const content = getMessageContent(msg);
      if (content) {
        saveMessageMutation.mutate({ workflowId, id: msg.id, role: msg.role, content, parts: msg.parts });
      }
    });
    lastSavedMessageCountRef.current = messages.length;
  }, [messages, isLoading, workflowId, saveMessageMutation]);

  const handleClearChat = useCallback(async () => {
    if (!workflowId) return;
    try {
      await clearMessagesMutation.mutateAsync({ workflowId });
      setMessages([]);
      processedMessagesRef.current.clear();
      lastSavedMessageCountRef.current = 0;
      hasLoadedMessagesRef.current = false;
      toast.success("Chat cleared");
    } catch {
      toast.error("Failed to clear chat");
    }
  }, [workflowId, clearMessagesMutation, setMessages]);

  const [input, setLocalInput] = useState("");
  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocalInput(e.target.value), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add node function
  const addNode = useCallback(
    (nodeType: NodeType): string | null => {
      if (!editor) {
        toast.error("Editor not initialized.");
        return null;
      }

      const nodes = editor.getNodes();

      // Handle triggers - only one allowed
      if (isTriggerNode(nodeType)) {
        const existing = nodes.find((n) => isTriggerNode(n.type as NodeType));
        if (existing) {
          if (!lastCreatedNodeIdsRef.current.includes(existing.id)) {
            lastCreatedNodeIdsRef.current.push(existing.id);
          }
          return existing.id;
        }
      }

      const hasInitial = nodes.some((n) => n.type === NodeType.INITIAL);
      const edges = editor.getEdges();
      const position = calculateNodePosition(nodeType, nodes, edges);
      const flowPosition = editor.screenToFlowPosition({ x: position.x, y: position.y });

      const newNode = {
        id: createId(),
        data: {},
        position: flowPosition,
        type: nodeType,
      };

      editor.setNodes(hasInitial ? [newNode] : [...nodes, newNode]);
      lastCreatedNodeIdsRef.current.push(newNode.id);
      if (lastCreatedNodeIdsRef.current.length > 10) lastCreatedNodeIdsRef.current.shift();

      return newNode.id;
    },
    [editor]
  );

  // Connect nodes function
  const connectNodes = useCallback(
    (sourceId: string, targetId: string) => {
      if (!editor) return;
      const nodes = editor.getNodes();
      const edges = editor.getEdges();

      if (!nodes.find((n) => n.id === sourceId) || !nodes.find((n) => n.id === targetId)) return;
      if (edges.find((e) => e.source === sourceId && e.target === targetId)) return;

      editor.setEdges([
        ...edges,
        { id: `${sourceId}-${targetId}`, source: sourceId, target: targetId, sourceHandle: "source-1", targetHandle: "target-1" },
      ]);
    },
    [editor]
  );

  // Configure node function
  const configureNode = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      if (!editor) return;
      const nodes = editor.getNodes();
      editor.setNodes(nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...config } } : n)));
    },
    [editor]
  );

  // Resolve node reference
  const resolveNodeRef = useCallback(
    (ref: string): string | null => {
      if (!editor) return null;
      const nodes = editor.getNodes();

      // Node type reference
      if (Object.values(NodeType).includes(ref as NodeType)) {
        const matches = nodes.filter((n) => n.type === ref);
        if (matches.length > 0) {
          const recentIds = new Set(lastCreatedNodeIdsRef.current);
          const recent = matches.find((n) => recentIds.has(n.id));
          return recent?.id || matches[0].id;
        }
        return null;
      }

      // "last" reference
      if (ref === "last") {
        return lastCreatedNodeIdsRef.current[lastCreatedNodeIdsRef.current.length - 1] || null;
      }

      // "previous", "previous2", etc.
      const match = ref.match(/^previous(\d*)$/);
      if (match) {
        const offset = match[1] ? parseInt(match[1], 10) : 1;
        const index = lastCreatedNodeIdsRef.current.length - (offset + 1);
        return index >= 0 ? lastCreatedNodeIdsRef.current[index] : null;
      }

      return ref; // Assume it's already an ID
    },
    [editor]
  );

  // Process action markers from messages
  useEffect(() => {
    if (isLoading) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;
    if (processedMessagesRef.current.has(lastMessage.id)) return;

    processedMessagesRef.current.add(lastMessage.id);

    const content = getMessageContent(lastMessage);
    if (!content) return;

    // Clear refs for new batch
    lastCreatedNodeIdsRef.current = [];

    // Find all action markers
    const addMatches = [...content.matchAll(ACTION_PATTERN)];
    const connectMatches = [...content.matchAll(CONNECT_PATTERN)];
    const configMatches = [...content.matchAll(CONFIGURE_PATTERN)];

    // Process ADD_NODE actions
    addMatches.forEach((match, idx) => {
      const nodeType = match[1] as NodeType;
      if (Object.values(NodeType).includes(nodeType)) {
        setTimeout(() => {
          addNode(nodeType);
          toast.success(`Added ${nodeType}`);
        }, idx * 150);
      }
    });

    // Process CONNECT_NODES actions (after nodes are created)
    const connectDelay = addMatches.length * 200 + 300;
    connectMatches.forEach((match, idx) => {
      setTimeout(() => {
        const sourceId = resolveNodeRef(match[1].trim());
        const targetId = resolveNodeRef(match[2].trim());

        if (sourceId && targetId) {
          const attemptConnect = (retries = 0) => {
            const nodes = editor?.getNodes();
            if (!nodes) return;

            const sourceExists = nodes.some((n) => n.id === sourceId);
            const targetExists = nodes.some((n) => n.id === targetId);

            if (sourceExists && targetExists) {
              connectNodes(sourceId, targetId);
              toast.success("Connected nodes");

              // Auto-layout after last connection
              if (idx === connectMatches.length - 1) {
                setTimeout(() => {
                  if (!editor) return;
                  import("../utils/node-layout").then(({ autoLayoutNodes }) => {
                    const updatedNodes = editor.getNodes();
                    const updatedEdges = editor.getEdges();
                    editor.setNodes(autoLayoutNodes(updatedNodes, updatedEdges));
                    setTimeout(() => editor.fitView({ padding: 0.2, duration: 400 }), 50);
                  });
                }, 200);
              }
            } else if (retries < 5) {
              setTimeout(() => attemptConnect(retries + 1), 150);
            }
          };
          attemptConnect();
        }
      }, connectDelay + idx * 100);
    });

    // Process CONFIGURE_NODE actions
    const configDelay = connectDelay + connectMatches.length * 150 + 200;
    configMatches.forEach((match, idx) => {
      setTimeout(() => {
        const nodeId = resolveNodeRef(match[1].trim());
        try {
          const config = JSON.parse(match[2]);
          if (nodeId && config) {
            configureNode(nodeId, config);
            toast.success("Configured node");
          }
        } catch {
          console.error("Failed to parse config:", match[2]);
        }
      }, configDelay + idx * 100);
    });
  }, [messages, isLoading, addNode, connectNodes, configureNode, resolveNodeRef, editor]);

  // Form submission
  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const message = input.trim();
      if (!message) return;

      setLocalInput("");
      if (sendMessage) {
        try {
          await sendMessage({ text: message });
        } catch {
          toast.error("Failed to send message");
        }
      }
    },
    [sendMessage, input]
  );

  return (
    <Card className="flex flex-col h-full w-full rounded-none overflow-hidden border-0 min-w-0 max-w-full bg-background">
      {/* Header */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <span className="text-xs text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={clearMessagesMutation.isPending}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            {clearMessagesMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : <Trash2 className="size-3 mr-1" />}
            Clear
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden relative w-full">
        <ScrollArea className="h-full w-full">
          <div className="p-4">
            <div className="space-y-3 w-full min-w-0">
              {isLoadingMessages && (
                <div className="text-center text-muted-foreground py-6">
                  <Loader2 className="size-6 mx-auto mb-2 animate-spin text-primary" />
                  <p className="text-xs">Loading...</p>
                </div>
              )}

              {!isLoadingMessages && messages.length === 0 && (
                <div className="text-center text-muted-foreground py-6">
                  <MessageCircle className="size-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-foreground">Build workflows with AI</p>
                  <p className="text-xs mt-2">Try: "Create a Telegram notification workflow"</p>
                </div>
              )}

              {messages.map((message) => {
                const content = getMessageContent(message);
                // Remove action markers from display
                const displayContent = content
                  .replace(ACTION_PATTERN, "")
                  .replace(CONNECT_PATTERN, "")
                  .replace(CONFIGURE_PATTERN, "")
                  .trim();

                if (!displayContent) return null;

                return (
                  <div key={message.id} className={`flex w-full min-w-0 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 min-w-0 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground border border-border"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-xl px-4 py-2.5">
                    <Loader2 className="size-4 animate-spin text-primary" />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-start w-full min-w-0">
                  <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 max-w-[80%]">
                    <p className="text-sm break-words">Error: {error.message || "Failed to send."}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="p-3 border-t border-border shrink-0 bg-card">
        <div className="flex gap-2 items-center">
          <div className="flex items-center text-muted-foreground px-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <Input
            value={input || ""}
            onChange={onInputChange}
            placeholder="Describe your workflow..."
            disabled={isLoading}
            className="flex-1 text-sm min-w-0 h-10 bg-background border-border rounded-lg focus-visible:ring-primary"
          />
          <Button
            type="submit"
            disabled={isLoading}
            size="icon"
            className="shrink-0 size-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground dark:shadow-[0_0_16px_rgba(0,33,243,0.4)]"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </Card>
  );
});
