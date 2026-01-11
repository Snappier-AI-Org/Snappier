"use client";

import { ExecutionStatus } from "@/generated/prisma";
import { CheckCircle2Icon, ClockIcon, Loader2Icon, XCircleIcon, AlertCircleIcon, ExternalLinkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSuspenseExecution } from "@/features/executions/hooks/use-executions";
import { parseError } from "@/features/executions/lib/error-parser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const getStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return <CheckCircle2Icon className="size-5 text-green-600" />;
    case ExecutionStatus.FAILED:
      return <XCircleIcon className="size-5 text-red-600" />;
    case ExecutionStatus.RUNNING:
      return <Loader2Icon className="size-5 text-blue-600 animate-spin" />;
    default:
      return <ClockIcon className="size-5 text-muted-foreground" />;

  }
};

const formatStatus = (status: ExecutionStatus) => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const ExecutionView = ({
  executionId
}: {
  executionId: string
}) => {
  const { data: execution } = useSuspenseExecution(executionId);
  const [showStackTrace, setShowStackTrace] = useState(false);

  const duration = execution.completedAt
    ? Math.round(
        (new Date(execution.completedAt).getTime() - new Date(
          execution.startedAt,
        ).getTime()) / 1000,
      )
    : null;
    return (
  <Card className="shadow-none">
    <CardHeader>
      <div className="flex items-center gap-3">
        {getStatusIcon(execution.status)}
        <div>
          <CardTitle>
            {formatStatus(execution.status)}
          </CardTitle>
          <CardDescription>
            Execution for {execution.workflow.name}
          </CardDescription>
        </div>
      </div>
    </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                <p className="text-sm font-medium text-muted-foreground">
                    Workflow
                </p>
                <Link
                    prefetch
                    className="text-sm hover:underline text-primary"
                    href={`/workflows/${execution.workflowId}`}
                >
                    {execution.workflow.name}
                </Link>
                </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Started</p>
                    <p className="text-sm">{formatDistanceToNow(execution.startedAt, { addSuffix: true })}</p>
                  </div>

                  {execution.completedAt ? (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-sm">{formatDistanceToNow(execution.completedAt, { addSuffix: true })}</p>
                  </div>
                  ) : null}

                  {duration !== null ? (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="text-sm">{duration} seconds</p>
                  </div>
                  ) : null}

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Event ID</p>
                    <p className="text-sm">{execution.inngestEventId}</p>
                  </div>
            </div>
                    {execution.error && (() => {
                      const parsedError = parseError(new Error(execution.error));
                      return (
                        <div className="mt-6 space-y-4">
                          <Alert variant="destructive">
                            <AlertCircleIcon className="h-4 w-4" />
                            <AlertTitle className="font-semibold">
                              {parsedError.message}
                            </AlertTitle>
                            <AlertDescription className="mt-2 space-y-3">
                              <p className="text-sm">
                                {parsedError.guidance}
                              </p>
                              
                              {parsedError.fixSteps && parsedError.fixSteps.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium mb-2">
                                    How to fix:
                                  </p>
                                  <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                                    {parsedError.fixSteps.map((step, index) => (
                                      <li key={index} className="text-sm">
                                        {step}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              {parsedError.errorCode && (
                                <div className="mt-2 pt-2 border-t border-red-200">
                                  <p className="text-xs text-muted-foreground">
                                    Error Code: {parsedError.errorCode}
                                  </p>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>

                          <div className="p-4 bg-muted rounded-md space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Technical Details
                              </p>
                              <p className="text-sm font-mono text-foreground break-words">
                                {execution.error}
                              </p>
                            </div>
                            {execution.errorStack && (
                              <Collapsible
                                open={showStackTrace}
                                onOpenChange={setShowStackTrace}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    {showStackTrace
                                      ? "Hide stack trace"
                                      : "Show stack trace"
                                    }
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <pre className="text-xs font-mono text-foreground overflow-auto mt-2 p-2 bg-background border rounded">
                                    {execution.errorStack}
                                  </pre>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>

                          {/* Quick action links */}
                          {(parsedError.errorCode === "INVALID_API_KEY" || 
                            parsedError.errorCode === "CREDENTIAL_NOT_FOUND" ||
                            parsedError.errorCode === "DECRYPTION_ERROR") && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <Link href="/credentials">
                                  <ExternalLinkIcon className="size-3 mr-2" />
                                  Go to Credentials
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <Link href={`/workflows/${execution.workflowId}`}>
                                  <ExternalLinkIcon className="size-3 mr-2" />
                                  Edit Workflow
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                      {execution.output && (
                        <div className="mt-6 p-4 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Output</p>
                          <pre className="text-xs font-mono overflow-auto">
                            {JSON.stringify(execution.output, null, 2)}
                          </pre>
                        </div>
                     )}


        </CardContent>
  </Card>
);
};