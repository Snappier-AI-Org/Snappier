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
import { getTodoistVariables } from "@/features/editor/lib/workflow-variables";
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
  operation: z.enum([
    "createTask",
    "getTask",
    "updateTask",
    "closeTask",
    "reopenTask",
    "deleteTask",
    "getActiveTasks",
    "createProject",
    "getProject",
    "getProjects",
    "deleteProject",
    "createComment",
    "getComments",
    "createLabel",
    "getLabels",
  ]),
  // Task fields
  taskId: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  projectId: z.string().optional(),
  sectionId: z.string().optional(),
  parentId: z.string().optional(),
  order: z.string().optional(),
  labels: z.string().optional(),
  priority: z.string().optional(),
  dueString: z.string().optional(),
  dueDate: z.string().optional(),
  dueDatetime: z.string().optional(),
  assigneeId: z.string().optional(),
  duration: z.string().optional(),
  durationUnit: z.string().optional(),
  // Project fields
  projectName: z.string().optional(),
  projectColor: z.string().optional(),
  projectViewStyle: z.string().optional(),
  isFavorite: z.boolean().optional(),
  // Comment fields
  commentContent: z.string().optional(),
  // Label fields
  labelName: z.string().optional(),
  labelColor: z.string().optional(),
  // Filter fields
  filter: z.string().optional(),
});

export type TodoistFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TodoistFormValues) => void;
  defaultValues?: Partial<TodoistFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const TodoistDialog = ({
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
      operation: defaultValues.operation || "createTask",
      taskId: defaultValues.taskId || "",
      content: defaultValues.content || "",
      description: defaultValues.description || "",
      projectId: defaultValues.projectId || "",
      sectionId: defaultValues.sectionId || "",
      parentId: defaultValues.parentId || "",
      order: defaultValues.order || "",
      labels: defaultValues.labels || "",
      priority: defaultValues.priority || "",
      dueString: defaultValues.dueString || "",
      dueDate: defaultValues.dueDate || "",
      dueDatetime: defaultValues.dueDatetime || "",
      assigneeId: defaultValues.assigneeId || "",
      duration: defaultValues.duration || "",
      durationUnit: defaultValues.durationUnit || "",
      projectName: defaultValues.projectName || "",
      projectColor: defaultValues.projectColor || "",
      projectViewStyle: defaultValues.projectViewStyle || "",
      isFavorite: defaultValues.isFavorite || false,
      commentContent: defaultValues.commentContent || "",
      labelName: defaultValues.labelName || "",
      labelColor: defaultValues.labelColor || "",
      filter: defaultValues.filter || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "createTask",
        taskId: defaultValues.taskId || "",
        content: defaultValues.content || "",
        description: defaultValues.description || "",
        projectId: defaultValues.projectId || "",
        sectionId: defaultValues.sectionId || "",
        parentId: defaultValues.parentId || "",
        order: defaultValues.order || "",
        labels: defaultValues.labels || "",
        priority: defaultValues.priority || "",
        dueString: defaultValues.dueString || "",
        dueDate: defaultValues.dueDate || "",
        dueDatetime: defaultValues.dueDatetime || "",
        assigneeId: defaultValues.assigneeId || "",
        duration: defaultValues.duration || "",
        durationUnit: defaultValues.durationUnit || "",
        projectName: defaultValues.projectName || "",
        projectColor: defaultValues.projectColor || "",
        projectViewStyle: defaultValues.projectViewStyle || "",
        isFavorite: defaultValues.isFavorite || false,
        commentContent: defaultValues.commentContent || "",
        labelName: defaultValues.labelName || "",
        labelColor: defaultValues.labelColor || "",
        filter: defaultValues.filter || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myTodoist";
  const watchOperation = form.watch("operation");

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Helper to check if operation needs task ID
  const needsTaskId = [
    "getTask",
    "updateTask",
    "closeTask",
    "reopenTask",
    "deleteTask",
    "createComment",
    "getComments",
  ].includes(watchOperation);

  // Helper to check if operation is a task creation/update
  const isTaskOperation = ["createTask", "updateTask"].includes(watchOperation);

  // Helper to check if operation is a project operation
  const isProjectOperation = [
    "createProject",
    "getProject",
    "deleteProject",
  ].includes(watchOperation);

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
          <img src="/logos/todoist.svg" alt="Todoist" className="w-6 h-6" />
          Configure Todoist Action
        </ConfigDialogTitle>
        <ConfigDialogDescription>
          Set up what this node should do in Todoist.
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
                  <Input placeholder="myTodoist" {...field} />
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
                      variables={getTodoistVariables(watchVariableName)}
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
                <FormLabel>Todoist Credential</FormLabel>
                <FormControl>
                  <CredentialSelect
                    type={CredentialType.TODOIST}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>Select a Todoist credential.</FormDescription>
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an operation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="createTask">
                      <span className="flex items-center gap-2">
                        ➕ Create Task
                      </span>
                    </SelectItem>
                    <SelectItem value="getTask">
                      <span className="flex items-center gap-2">
                        📋 Get Task
                      </span>
                    </SelectItem>
                    <SelectItem value="updateTask">
                      <span className="flex items-center gap-2">
                        ✏️ Update Task
                      </span>
                    </SelectItem>
                    <SelectItem value="closeTask">
                      <span className="flex items-center gap-2">
                        ✅ Close Task
                      </span>
                    </SelectItem>
                    <SelectItem value="reopenTask">
                      <span className="flex items-center gap-2">
                        🔄 Reopen Task
                      </span>
                    </SelectItem>
                    <SelectItem value="deleteTask">
                      <span className="flex items-center gap-2">
                        🗑️ Delete Task
                      </span>
                    </SelectItem>
                    <SelectItem value="getActiveTasks">
                      <span className="flex items-center gap-2">
                        📝 Get Active Tasks
                      </span>
                    </SelectItem>
                    <SelectItem value="createProject">
                      <span className="flex items-center gap-2">
                        📁 Create Project
                      </span>
                    </SelectItem>
                    <SelectItem value="getProject">
                      <span className="flex items-center gap-2">
                        📂 Get Project
                      </span>
                    </SelectItem>
                    <SelectItem value="getProjects">
                      <span className="flex items-center gap-2">
                        📚 Get All Projects
                      </span>
                    </SelectItem>
                    <SelectItem value="deleteProject">
                      <span className="flex items-center gap-2">
                        🗑️ Delete Project
                      </span>
                    </SelectItem>
                    <SelectItem value="createComment">
                      <span className="flex items-center gap-2">
                        💬 Create Comment
                      </span>
                    </SelectItem>
                    <SelectItem value="getComments">
                      <span className="flex items-center gap-2">
                        💭 Get Comments
                      </span>
                    </SelectItem>
                    <SelectItem value="createLabel">
                      <span className="flex items-center gap-2">
                        🏷️ Create Label
                      </span>
                    </SelectItem>
                    <SelectItem value="getLabels">
                      <span className="flex items-center gap-2">
                        🏷️ Get All Labels
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Task ID - for operations that need it */}
          {needsTaskId && (
            <FormField
              control={form.control}
              name="taskId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Task ID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-sm">
                            The unique ID of the task. You can get this from a
                            previous Todoist node or from the task URL.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormDescription>
                    The ID of the task to operate on.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Content - for createTask and updateTask */}
          {isTaskOperation && (
            <>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Task Content {watchOperation === "createTask" && "*"}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Buy groceries" {...field} />
                    </FormControl>
                    <FormDescription>
                      The content/title of the task.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details about the task..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description for the task.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Natural Language)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="tomorrow at 5pm, next Monday, in 3 days"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Natural language due date (e.g., "tomorrow", "next
                      Friday").
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Priority 1 (Urgent)</SelectItem>
                        <SelectItem value="2">Priority 2 (High)</SelectItem>
                        <SelectItem value="3">Priority 3 (Medium)</SelectItem>
                        <SelectItem value="4">Priority 4 (Low)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Task priority (1 = urgent, 4 = low).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="labels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Labels</FormLabel>
                    <FormControl>
                      <Input placeholder="work, urgent, review" {...field} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list of label names.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Project ID - for task operations and project get/delete */}
          {(isTaskOperation ||
            watchOperation === "getActiveTasks" ||
            watchOperation === "getProject" ||
            watchOperation === "deleteProject") && (
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormDescription>
                    {watchOperation === "getActiveTasks"
                      ? "Filter tasks by project ID."
                      : "The ID of the project."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Project Name - for createProject */}
          {watchOperation === "createProject" && (
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="My Project" {...field} />
                  </FormControl>
                  <FormDescription>The name of the new project.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Filter - for getActiveTasks */}
          {watchOperation === "getActiveTasks" && (
            <FormField
              control={form.control}
              name="filter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Filter Query
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-sm">
                            Todoist filter query (e.g., "today", "overdue", "p1",
                            "#Work").
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="today | overdue" {...field} />
                  </FormControl>
                  <FormDescription>
                    Filter tasks using Todoist filter syntax.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Comment Content - for createComment */}
          {watchOperation === "createComment" && (
            <FormField
              control={form.control}
              name="commentContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment Content *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Your comment here..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The text content of the comment.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Label Name - for createLabel */}
          {watchOperation === "createLabel" && (
            <FormField
              control={form.control}
              name="labelName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="urgent" {...field} />
                  </FormControl>
                  <FormDescription>The name of the new label.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <ConfigDialogFooter>
            <Button type="submit">Save Changes</Button>
          </ConfigDialogFooter>
        </form>
      </Form>
    </ConfigurationPanelLayout>
  );
};
