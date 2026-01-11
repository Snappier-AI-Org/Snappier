"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Power, PowerOff, RefreshCw } from "lucide-react";
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
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import {
  startGmailWatch,
  stopGmailWatch,
  getGmailWatchStatus,
} from "./actions";

// Gmail trigger variables
const GMAIL_TRIGGER_VARIABLES = [
  {
    token: "{{gmailTrigger.email.from}}",
    label: "From",
    description: "Sender's email address",
  },
  {
    token: "{{gmailTrigger.email.to}}",
    label: "To",
    description: "Recipient's email address",
  },
  {
    token: "{{gmailTrigger.email.subject}}",
    label: "Subject",
    description: "Email subject line",
  },
  {
    token: "{{gmailTrigger.email.body}}",
    label: "Body",
    description: "Email body (text or HTML)",
  },
  {
    token: "{{gmailTrigger.email.bodyText}}",
    label: "Body (Text)",
    description: "Plain text email body",
  },
  {
    token: "{{gmailTrigger.email.bodyHtml}}",
    label: "Body (HTML)",
    description: "HTML email body",
  },
  {
    token: "{{gmailTrigger.email.snippet}}",
    label: "Snippet",
    description: "Short preview of the email",
  },
  {
    token: "{{gmailTrigger.email.id}}",
    label: "Message ID",
    description: "Gmail message ID",
  },
  {
    token: "{{gmailTrigger.email.threadId}}",
    label: "Thread ID",
    description: "Gmail thread ID",
  },
  {
    token: "{{gmailTrigger.email.date}}",
    label: "Date",
    description: "Email received date",
  },
  {
    token: "{{gmailTrigger.timestamp}}",
    label: "Trigger Timestamp",
    description: "When the trigger fired",
  },
  {
    token: "{{json gmailTrigger.email}}",
    label: "Full Email JSON",
    description: "Complete email object as JSON",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData?: {
    credentialId?: string;
    labelIds?: string[];
  };
  onNodeDataChange?: (data: { credentialId?: string; labelIds?: string[] }) => void;
}

export const GmailTriggerDialog = ({
  open,
  onOpenChange,
  nodeData,
  onNodeDataChange,
}: Props) => {
  const [selectedCredentialId, setSelectedCredentialId] = useState(
    nodeData?.credentialId || ""
  );
  const [isWatchActive, setIsWatchActive] = useState(false);
  const [watchExpiration, setWatchExpiration] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const params = useParams();
  const workflowId = params.workflowId as string;

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.GMAIL);

  // Update selectedCredentialId when nodeData changes
  useEffect(() => {
    if (nodeData?.credentialId) {
      setSelectedCredentialId(nodeData.credentialId);
    }
  }, [nodeData?.credentialId]);

  // Check watch status when dialog opens or credential changes
  useEffect(() => {
    if (open && selectedCredentialId && workflowId) {
      checkWatchStatus();
    }
  }, [open, selectedCredentialId, workflowId]);

  const checkWatchStatus = async () => {
    if (!selectedCredentialId || !workflowId) return;

    setIsCheckingStatus(true);
    try {
      const status = await getGmailWatchStatus(workflowId, selectedCredentialId);
      setIsWatchActive(status.active);
      setWatchExpiration(status.expiration);
    } catch (error) {
      console.error("Error checking watch status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCredentialChange = (credentialId: string) => {
    setSelectedCredentialId(credentialId);
    onNodeDataChange?.({ ...nodeData, credentialId });
  };

  const handleStartWatch = async () => {
    if (!selectedCredentialId || !workflowId) {
      toast.error("Please select a Gmail credential first");
      return;
    }

    setIsLoading(true);
    try {
      const result = await startGmailWatch(
        workflowId,
        selectedCredentialId,
        nodeData?.labelIds || ["INBOX"]
      );

      if (result.success) {
        toast.success("Gmail trigger activated! Watching for new emails.");
        setIsWatchActive(true);
        await checkWatchStatus();
      } else {
        toast.error(result.error || "Failed to start Gmail watch");
      }
    } catch (error) {
      console.error("Error starting watch:", error);
      toast.error("Failed to start Gmail watch");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopWatch = async () => {
    if (!selectedCredentialId || !workflowId) return;

    setIsLoading(true);
    try {
      const result = await stopGmailWatch(workflowId, selectedCredentialId);

      if (result.success) {
        toast.success("Gmail trigger deactivated");
        setIsWatchActive(false);
        setWatchExpiration(undefined);
      } else {
        toast.error(result.error || "Failed to stop Gmail watch");
      }
    } catch (error) {
      console.error("Error stopping watch:", error);
      toast.error("Failed to stop Gmail watch");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gmail Trigger Configuration</DialogTitle>
          <DialogDescription>
            Configure this trigger to run your workflow when a new email arrives
            in your Gmail inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-6">
          {/* Credential Selection */}
          <div className="space-y-2">
            <Label htmlFor="credential">Gmail Account</Label>
            <Select
              value={selectedCredentialId}
              onValueChange={handleCredentialChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a Gmail account" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCredentials ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Loading credentials...
                  </div>
                ) : !credentials?.length ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No Gmail credentials found. Create one in Credentials.
                  </div>
                ) : (
                  credentials.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      {cred.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Watch Status */}
          {selectedCredentialId && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    Trigger Status
                    {isCheckingStatus && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </h4>
                  {isWatchActive ? (
                    <div className="flex items-center gap-2 text-sm text-[#0021F3] dark:text-[#5C70EA]">
                      <CheckCircle2 className="h-4 w-4" />
                      Active - Watching for new emails
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Inactive - Enable to start receiving emails
                    </div>
                  )}
                  {watchExpiration && isWatchActive && (
                    <p className="text-xs text-muted-foreground">
                      Auto-renews before {watchExpiration.toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkWatchStatus}
                    disabled={isLoading || isCheckingStatus}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isCheckingStatus ? "animate-spin" : ""}`}
                    />
                  </Button>

                  {isWatchActive ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopWatch}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PowerOff className="h-4 w-4 mr-2" />
                      )}
                      Stop Trigger
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleStartWatch}
                      disabled={isLoading || !selectedCredentialId}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Power className="h-4 w-4 mr-2" />
                      )}
                      Start Trigger
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Available Variables */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h4 className="font-medium text-sm">Available Data</h4>
            <p className="text-xs text-muted-foreground">
              When a new email arrives, you can access this data in subsequent nodes:
            </p>
            <VariableTokenList variables={GMAIL_TRIGGER_VARIABLES} />
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
