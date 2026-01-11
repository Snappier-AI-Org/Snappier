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
import { getTrelloVariables } from "@/features/editor/lib/workflow-variables";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Credential is required"),
  operation: z.enum(["createCard", "getCard", "updateCard", "moveCard", "deleteCard", "addComment", "searchCards"]),
  boardId: z.string().optional(),
  listId: z.string().optional(),
  cardId: z.string().optional(),
  cardName: z.string().optional(),
  cardDescription: z.string().optional(),
  comment: z.string().optional(),
  searchQuery: z.string().optional(),
  dueDate: z.string().optional(),
  labels: z.string().optional(),
});

export type TrelloFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TrelloFormValues) => void;
  defaultValues?: Partial<TrelloFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}


export const TrelloDialog = ({
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
      operation: defaultValues.operation || "createCard",
      boardId: defaultValues.boardId || "",
      listId: defaultValues.listId || "",
      cardId: defaultValues.cardId || "",
      cardName: defaultValues.cardName || "",
      cardDescription: defaultValues.cardDescription || "",
      comment: defaultValues.comment || "",
      searchQuery: defaultValues.searchQuery || "",
      dueDate: defaultValues.dueDate || "",
      labels: defaultValues.labels || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "createCard",
        boardId: defaultValues.boardId || "",
        listId: defaultValues.listId || "",
        cardId: defaultValues.cardId || "",
        cardName: defaultValues.cardName || "",
        cardDescription: defaultValues.cardDescription || "",
        comment: defaultValues.comment || "",
        searchQuery: defaultValues.searchQuery || "",
        dueDate: defaultValues.dueDate || "",
        labels: defaultValues.labels || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myTrello";
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
      className="max-w-4xl"
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle className="flex items-center gap-2">
          <img src="/logos/trello.svg" alt="Trello" className="w-6 h-6" />
          Configure Trello Action
        </ConfigDialogTitle>
        <ConfigDialogDescription>
          Set up what this node should do in Trello.
        </ConfigDialogDescription>
      </ConfigDialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="myTrello"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use this name to reference the result in other nodes.
                  </FormDescription>
                  {watchVariableName && (
                    <div className="rounded-md border bg-muted/40 p-3 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Available outputs (click to copy):
                      </p>
                      <VariableTokenList
                        variables={getTrelloVariables(watchVariableName)}
                        emptyMessage=""
                      />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trello Credential</FormLabel>
                  <FormControl>
                    <CredentialSelect
                      type={CredentialType.TRELLO}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Select a Trello credential.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an operation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="createCard">
                        <span className="flex items-center gap-2">➕ Create Card</span>
                      </SelectItem>
                      <SelectItem value="getCard">
                        <span className="flex items-center gap-2">📋 Get Card</span>
                      </SelectItem>
                      <SelectItem value="updateCard">
                        <span className="flex items-center gap-2">✏️ Update Card</span>
                      </SelectItem>
                      <SelectItem value="moveCard">
                        <span className="flex items-center gap-2">📦 Move Card</span>
                      </SelectItem>
                      <SelectItem value="deleteCard">
                        <span className="flex items-center gap-2">🗑️ Delete Card</span>
                      </SelectItem>
                      <SelectItem value="addComment">
                        <span className="flex items-center gap-2">💬 Add Comment</span>
                      </SelectItem>
                      <SelectItem value="searchCards">
                        <span className="flex items-center gap-2">🔍 Search Cards</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Board ID - needed for create and search */}
            {(watchOperation === "createCard" || watchOperation === "searchCards") && (
              <FormField
                control={form.control}
                name="boardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Board ID
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="text-sm">Open your Trello board in the browser.</p>
                            <p className="text-sm mt-2">The URL looks like:</p>
                            <code className="text-xs bg-background/20 px-1 py-0.5 rounded block mt-1">trello.com/b/<strong>BOARD_ID</strong>/board-name</code>
                            <p className="text-xs opacity-80 mt-2">Copy the part after <code className="text-[11px] bg-background/20 px-0.5 rounded">/b/</code> — that is your Board ID.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="5f8b9c1e2d3a4b5c6d7e8f9a"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Paste the Board ID from the Trello URL (the short string after <code>/b/</code>).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* List ID - needed for create and move */}
            {(watchOperation === "createCard" || watchOperation === "moveCard") && (
              <FormField
                control={form.control}
                name="listId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      List ID
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="text-sm">Open any card in the list, then add <code className="text-[11px] bg-background/20 px-0.5 rounded">.json</code> to the end of the URL.</p>
                            <p className="text-sm mt-2">Search for <code className="text-[11px] bg-background/20 px-0.5 rounded">"idList"</code> in the JSON and copy its value.</p>
                            <p className="text-xs opacity-80 mt-2">Tip: You can also append <code className="text-[11px] bg-background/20 px-0.5 rounded">.json</code> to the board URL and find the list object by name.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="5f8b9c1e2d3a4b5c6d7e8f9a"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Find the List ID by opening a card from that list, append <code>.json</code>, and copy the <code>idList</code> value.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Card ID - needed for get, update, move, delete, addComment */}
            {["getCard", "updateCard", "moveCard", "deleteCard", "addComment"].includes(watchOperation) && (
              <FormField
                control={form.control}
                name="cardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="5f8b9c1e2d3a4b5c6d7e8f9a"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The ID of the card. Open a card and add ".json" to the URL to find the card ID.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Card Name - for create and update */}
            {(watchOperation === "createCard" || watchOperation === "updateCard") && (
              <FormField
                control={form.control}
                name="cardName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My new task"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The title of the card. Supports variables like {`{{previousNode.value}}`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Card Description - for create and update */}
            {(watchOperation === "createCard" || watchOperation === "updateCard") && (
              <FormField
                control={form.control}
                name="cardDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Description of the card..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Markdown is supported. Supports variables like {`{{previousNode.value}}`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Due Date - for create and update */}
            {(watchOperation === "createCard" || watchOperation === "updateCard") && (
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Set a due date for the card.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Labels - for create and update */}
            {(watchOperation === "createCard" || watchOperation === "updateCard") && (
              <FormField
                control={form.control}
                name="labels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label IDs (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="labelId1,labelId2"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated label IDs to add to the card.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Comment - for addComment */}
            {watchOperation === "addComment" && (
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Your comment here..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The comment text to add to the card. Supports variables.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Search Query */}
            {watchOperation === "searchCards" && (
              <FormField
                control={form.control}
                name="searchQuery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Query</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="bug fix"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Search for cards by name or description. Supports Trello search operators.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <ConfigDialogFooter>
              <Button type="submit">Save</Button>
            </ConfigDialogFooter>
          </form>
        </Form>
    </ConfigurationPanelLayout>
  );
};
