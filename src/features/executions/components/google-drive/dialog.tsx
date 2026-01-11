"use client";

import z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import { CredentialType } from "@/generated/prisma";
import {
  ConfigDialogDescription,
  ConfigDialogFooter,
  ConfigDialogHeader,
  ConfigDialogTitle,
  ConfigurationPanelLayout,
} from "@/features/editor/components/configuration-panel-layout";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";
import { getGoogleDriveVariables } from "@/features/editor/lib/workflow-variables";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// Schema
// =============================================================================

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Credential is required"),
  operation: z.enum(["list", "upload", "download", "create_folder", "delete", "move", "copy", "share"]),
  folderId: z.string().optional(),
  fileId: z.string().optional(),
  fileName: z.string().optional(),
  fileContent: z.string().optional(),
  mimeType: z.string().optional(),
  destinationFolderId: z.string().optional(),
  shareEmail: z.string().email().optional().or(z.literal("")),
  shareRole: z.enum(["reader", "commenter", "writer"]).optional(),
  query: z.string().optional(),
});

export type GoogleDriveFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Helpers
// =============================================================================

const OPERATION_INFO: Record<string, { label: string; description: string }> = {
  list: { label: "📂 List Files", description: "Browse files and folders in your Drive" },
  upload: { label: "📤 Upload File", description: "Upload new content to Drive" },
  download: { label: "📥 Download File", description: "Download a file's content" },
  create_folder: { label: "📁 Create Folder", description: "Create a new folder" },
  delete: { label: "🗑️ Delete", description: "Delete a file or folder" },
  move: { label: "📦 Move File", description: "Move a file to another folder" },
  copy: { label: "📋 Copy File", description: "Create a copy of a file" },
  share: { label: "🔗 Share File", description: "Share a file with someone" },
};

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleDriveFormValues) => void;
  defaultValues?: Partial<GoogleDriveFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const GoogleDriveDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "list",
      folderId: defaultValues.folderId || "",
      fileId: defaultValues.fileId || "",
      fileName: defaultValues.fileName || "",
      fileContent: defaultValues.fileContent || "",
      mimeType: defaultValues.mimeType || "",
      destinationFolderId: defaultValues.destinationFolderId || "",
      shareEmail: defaultValues.shareEmail || "",
      shareRole: defaultValues.shareRole || "reader",
      query: defaultValues.query || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "list",
        folderId: defaultValues.folderId || "",
        fileId: defaultValues.fileId || "",
        fileName: defaultValues.fileName || "",
        fileContent: defaultValues.fileContent || "",
        mimeType: defaultValues.mimeType || "",
        destinationFolderId: defaultValues.destinationFolderId || "",
        shareEmail: defaultValues.shareEmail || "",
        shareRole: defaultValues.shareRole || "reader",
        query: defaultValues.query || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myDrive";
  const watchOperation = form.watch("operation");

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
      className="max-w-2xl"
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle className="flex items-center gap-2">
          <img src="/logos/google-drive.svg" alt="Google Drive" className="w-6 h-6" />
          Configure Google Drive Action
        </ConfigDialogTitle>
        <ConfigDialogDescription>
          Set up what this node should do with your files.
        </ConfigDialogDescription>
      </ConfigDialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 mt-4"
        >
          {/* Variable Name - First field for consistency */}
          <FormField
            control={form.control}
            name="variableName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Output Variable Name
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Use this name to access the result in later nodes.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input placeholder="myDrive" {...field} />
                </FormControl>
                {watchVariableName && (
                  <div className="rounded-md border bg-muted/40 p-3 mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Available outputs (click to copy):
                    </p>
                    <VariableTokenList
                      variables={getGoogleDriveVariables(watchVariableName)}
                      emptyMessage=""
                    />
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Credential Selection */}
          <FormField
            control={form.control}
            name="credentialId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Google Account
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Select which Google account to use. You can connect accounts in the Credentials page.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <CredentialSelect
                    type={CredentialType.GOOGLE_DRIVE}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Operation Selection */}
          <FormField
            control={form.control}
            name="operation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What do you want to do?</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an operation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(OPERATION_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {OPERATION_INFO[watchOperation]?.description}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Folder ID - for list, upload, create_folder */}
          {(watchOperation === "list" ||
            watchOperation === "upload" ||
            watchOperation === "create_folder") && (
            <FormField
              control={form.control}
              name="folderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    {watchOperation === "list"
                      ? "Folder ID (Optional)"
                      : "Parent Folder ID (Optional)"}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="mb-2">Find the Folder ID in the URL:</p>
                          <code className="text-xs bg-background/20 px-1 rounded block">
                            drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
                          </code>
                          <p className="mt-2 opacity-80 text-xs">Leave empty to use the root folder.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Leave empty for root folder"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* File ID - for download, delete, move, copy, share */}
          {(watchOperation === "download" ||
            watchOperation === "delete" ||
            watchOperation === "move" ||
            watchOperation === "copy" ||
            watchOperation === "share") && (
            <FormField
              control={form.control}
              name="fileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    File ID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="mb-2">Find the File ID in the URL:</p>
                          <code className="text-xs bg-background/20 px-1 rounded block">
                            drive.google.com/file/d/<strong>FILE_ID</strong>/view
                          </code>
                          <p className="mt-2 opacity-80 text-xs">Or use a variable from a previous List Files node.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="File or folder ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* File Name - for upload, create_folder */}
          {(watchOperation === "upload" ||
            watchOperation === "create_folder") && (
            <FormField
              control={form.control}
              name="fileName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchOperation === "upload" ? "File Name" : "Folder Name"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        watchOperation === "upload"
                          ? "document.txt"
                          : "New Folder"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    You can use variables like <code className="text-xs bg-muted px-1 rounded">{"{{trigger.data.filename}}"}</code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* File Content - for upload */}
          {watchOperation === "upload" && (
            <>
              <FormField
                control={form.control}
                name="fileContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter file content or use variables..."
                        className="min-h-[100px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Content to upload. Use <code className="text-xs bg-muted px-1 rounded">{"{{previousNode.output}}"}</code> for dynamic values.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mimeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Type (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "auto"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-detect" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="auto">📄 Auto-detect</SelectItem>
                        <SelectItem value="text/plain">📝 Plain Text (.txt)</SelectItem>
                        <SelectItem value="application/json">🔧 JSON (.json)</SelectItem>
                        <SelectItem value="text/csv">📊 CSV (.csv)</SelectItem>
                        <SelectItem value="text/html">🌐 HTML (.html)</SelectItem>
                        <SelectItem value="application/pdf">📕 PDF (.pdf)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Destination Folder - for move, copy */}
          {(watchOperation === "move" || watchOperation === "copy") && (
            <FormField
              control={form.control}
              name="destinationFolderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Destination Folder ID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>The ID of the folder where you want to {watchOperation} the file.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Target folder ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Share settings */}
          {watchOperation === "share" && (
            <>
              <FormField
                control={form.control}
                name="shareEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share With (Email)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The email address of the person to share with.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shareRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select permission" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="reader">👁️ Viewer - Can view only</SelectItem>
                        <SelectItem value="commenter">💬 Commenter - Can comment</SelectItem>
                        <SelectItem value="writer">✏️ Editor - Can edit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Search query - for list */}
          {watchOperation === "list" && (
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Filter (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name contains 'report'"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Examples: <code className="text-xs bg-muted px-1 rounded">name contains 'report'</code> or <code className="text-xs bg-muted px-1 rounded">mimeType = 'application/pdf'</code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <ConfigDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Configuration</Button>
          </ConfigDialogFooter>
        </form>
      </Form>
    </ConfigurationPanelLayout>
  );
};
