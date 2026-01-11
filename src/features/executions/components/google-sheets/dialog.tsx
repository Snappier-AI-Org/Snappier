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
import { useForm, useFieldArray } from "react-hook-form";
import { useEffect, useState, useCallback, useRef } from "react";
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
import { getGoogleSheetsVariables } from "@/features/editor/lib/workflow-variables";
import { fetchSpreadsheetSheets } from "./actions";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Plus, Trash2, HelpCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// Schema
// =============================================================================

const rowSchema = z.object({
  cells: z.array(z.string()),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Credential is required"),
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
  sheetName: z.string().min(1, "Sheet name is required"),
  range: z.string().optional(),
  operation: z.enum(["append", "read", "update"]),
  // Visual row builder
  rows: z.array(rowSchema).optional(),
  // Advanced mode (raw JSON)
  useAdvancedMode: z.boolean().optional(),
  values: z.string().optional(),
});

export type GoogleSheetsFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Helpers
// =============================================================================

const parseRowsToJson = (rows: { cells: string[] }[]): string => {
  if (!rows || rows.length === 0) return "[]";
  return JSON.stringify(rows.map(row => row.cells));
};

const parseJsonToRows = (json: string): { cells: string[] }[] => {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.map(row => ({
        cells: Array.isArray(row) ? row.map(String) : [String(row)]
      }));
    }
  } catch {
    // Invalid JSON, return empty
  }
  return [];
};

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleSheetsFormValues) => void;
  defaultValues?: Partial<GoogleSheetsFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const GoogleSheetsDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [availableSheets, setAvailableSheets] = useState<{ sheetId: number; title: string; index: number }[]>([]);
  const [isFetchingSheets, setIsFetchingSheets] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsValidated, setSheetsValidated] = useState(false);

  // Parse existing values to rows for visual builder
  const initialRows = defaultValues.rows || 
    (defaultValues.values ? parseJsonToRows(defaultValues.values) : []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      spreadsheetId: defaultValues.spreadsheetId || "",
      sheetName: defaultValues.sheetName || "Sheet1",
      range: defaultValues.range || "",
      operation: defaultValues.operation || "append",
      rows: initialRows,
      useAdvancedMode: defaultValues.useAdvancedMode || false,
      values: defaultValues.values || "",
    },
  });

  const rowsArray = useFieldArray({ control: form.control, name: "rows" });

  const watchCredentialId = form.watch("credentialId");
  const watchSpreadsheetId = form.watch("spreadsheetId");
  const watchVariableName = form.watch("variableName") || "mySheets";
  const watchOperation = form.watch("operation");
  const watchUseAdvancedMode = form.watch("useAdvancedMode");
  const watchRows = form.watch("rows") || [];

  // Fetch available sheets when credential and spreadsheet ID are both available
  const fetchSheets = useCallback(async () => {
    if (!watchCredentialId || !watchSpreadsheetId?.trim()) {
      setAvailableSheets([]);
      setSheetsError(null);
      setSheetsValidated(false);
      return;
    }

    setIsFetchingSheets(true);
    setSheetsError(null);
    setSheetsValidated(false);

    try {
      const result = await fetchSpreadsheetSheets(watchCredentialId, watchSpreadsheetId.trim());

      if (result.success && result.sheets) {
        setAvailableSheets(result.sheets);
        setSheetsValidated(true);

        // Auto-select first sheet if current sheet name is empty or doesn't exist
        const currentSheetName = form.getValues("sheetName");
        const sheetExists = result.sheets.some(s => s.title === currentSheetName);

        if ((!currentSheetName || !sheetExists) && result.sheets.length > 0) {
          form.setValue("sheetName", result.sheets[0].title);
        }
      } else {
        setSheetsError(result.error || "Failed to fetch sheets");
        setAvailableSheets([]);
      }
    } catch (error) {
      console.error("[Google Sheets Dialog] Error fetching sheets:", error);
      setSheetsError("Failed to connect to Google Sheets");
      setAvailableSheets([]);
    } finally {
      setIsFetchingSheets(false);
    }
  }, [watchCredentialId, watchSpreadsheetId, form]);

  // Auto-fetch sheets when credential or spreadsheet ID changes (with debounce for spreadsheet ID)
  useEffect(() => {
    if (!watchCredentialId || !watchSpreadsheetId?.trim()) {
      setAvailableSheets([]);
      setSheetsError(null);
      setSheetsValidated(false);
      return;
    }

    // Debounce spreadsheet ID input to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchSheets();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchCredentialId, watchSpreadsheetId, fetchSheets]);

  useEffect(() => {
    if (open) {
      const parsedRows = defaultValues.rows || 
        (defaultValues.values ? parseJsonToRows(defaultValues.values) : []);
      
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        spreadsheetId: defaultValues.spreadsheetId || "",
        sheetName: defaultValues.sheetName || "Sheet1",
        range: defaultValues.range || "",
        operation: defaultValues.operation || "append",
        rows: parsedRows,
        useAdvancedMode: defaultValues.useAdvancedMode || false,
        values: defaultValues.values || "",
      });
      setAvailableSheets([]);
      setSheetsError(null);
      setSheetsValidated(false);
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // If using visual builder, convert rows to JSON string
    if (!values.useAdvancedMode && values.rows && values.rows.length > 0) {
      values.values = parseRowsToJson(values.rows);
    }
    onSubmit(values);
    onOpenChange(false);
  };

  const addRow = (numCells: number = 2) => {
    rowsArray.append({ cells: Array(numCells).fill("") });
  };

  const addCellToRow = (rowIndex: number) => {
    const currentRow = form.getValues(`rows.${rowIndex}`);
    if (currentRow) {
      form.setValue(`rows.${rowIndex}.cells`, [...currentRow.cells, ""]);
    }
  };

  const removeCellFromRow = (rowIndex: number, cellIndex: number) => {
    const currentRow = form.getValues(`rows.${rowIndex}`);
    if (currentRow && currentRow.cells.length > 1) {
      const newCells = currentRow.cells.filter((_, i) => i !== cellIndex);
      form.setValue(`rows.${rowIndex}.cells`, newCells);
    }
  };

  const needsValues = watchOperation === "append" || watchOperation === "update";

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
      className="max-w-3xl"
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle className="flex items-center gap-2">
          <img src="/logos/google-sheets.svg" alt="Google Sheets" className="w-6 h-6" />
          Configure Google Sheets Action
        </ConfigDialogTitle>
        <ConfigDialogDescription>
          Set up what this node should do with your spreadsheet.
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
                        <p>Use this name to access the result in later nodes, like <code>{"{{sheets.values}}"}</code></p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input placeholder="mySheets" {...field} />
                </FormControl>
                {watchVariableName && (
                  <div className="rounded-md border bg-muted/40 p-3 mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Available outputs (click to copy):
                    </p>
                    <VariableTokenList
                      variables={getGoogleSheetsVariables(watchVariableName)}
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
                    type={CredentialType.GOOGLE_SHEETS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Spreadsheet ID */}
          <FormField
            control={form.control}
            name="spreadsheetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Spreadsheet ID
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="mb-2">Find the Spreadsheet ID in the URL:</p>
                        <code className="text-xs bg-background/20 px-1 rounded block">
                          docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
                        </code>
                        <p className="mt-2 opacity-80">Copy the long string between /d/ and /edit</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="flex items-center gap-2">
                  {isFetchingSheets && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Validating...</span>
                    </span>
                  )}
                  {sheetsValidated && !isFetchingSheets && (
                    <span className="flex items-center gap-1 text-[#0021F3] dark:text-[#5C70EA]">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-xs">Connected!</span>
                    </span>
                  )}
                </FormDescription>
                {sheetsError && (
                  <div className="flex items-start gap-2 text-sm text-destructive mt-1">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{sheetsError}</span>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sheet Name */}
          <FormField
            control={form.control}
            name="sheetName"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Sheet Tab</FormLabel>
                  {watchCredentialId && watchSpreadsheetId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={fetchSheets}
                      disabled={isFetchingSheets}
                      className="h-6 px-2 text-xs"
                    >
                      {isFetchingSheets ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Refresh
                    </Button>
                  )}
                </div>
                {availableSheets.length > 0 ? (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a sheet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSheets.map((sheet) => (
                        <SelectItem key={sheet.sheetId} value={sheet.title}>
                          📄 {sheet.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input
                      placeholder="Sheet1"
                      {...field}
                    />
                  </FormControl>
                )}
                <FormDescription>
                  {availableSheets.length > 0
                    ? `Found ${availableSheets.length} sheet${availableSheets.length > 1 ? "s" : ""} in this spreadsheet.`
                    : "Enter the name of the sheet tab, or paste a valid Spreadsheet ID above to see available sheets."}
                </FormDescription>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an operation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="read">
                      <span className="flex items-center gap-2">📖 Read data from sheet</span>
                    </SelectItem>
                    <SelectItem value="append">
                      <span className="flex items-center gap-2">➕ Add new rows</span>
                    </SelectItem>
                    <SelectItem value="update">
                      <span className="flex items-center gap-2">✏️ Update existing cells</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {watchOperation === "read" && "Get data from your spreadsheet to use in other nodes."}
                  {watchOperation === "append" && "Add new rows at the end of your sheet."}
                  {watchOperation === "update" && "Modify specific cells in your sheet."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Range - for read and update */}
          {watchOperation === "read" && (
            <FormField
              control={form.control}
              name="range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Range (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="A1:Z1000 or leave empty for entire sheet"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty to read the entire sheet, or specify a range like A1:D100
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {watchOperation === "update" && (
            <FormField
              control={form.control}
              name="range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Range (Required)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="A1:B2"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The cells to update, e.g., A1:B2 for a 2x2 area starting at A1
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Visual Row Builder */}
          {needsValues && !watchUseAdvancedMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base">
                  📊 Data to {watchOperation === "append" ? "Add" : "Update"}
                </FormLabel>
              </div>

              {rowsArray.fields.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    No rows added yet. Click below to add your first row.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addRow(2)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Row (2 columns)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addRow(4)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Row (4 columns)
                    </Button>
                  </div>
                </div>
              )}

              {rowsArray.fields.map((field, rowIndex) => (
                <Card key={field.id} className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => rowsArray.remove(rowIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <CardContent className="pt-4 pb-4 pr-12">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Row {rowIndex + 1}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {watchRows[rowIndex]?.cells.map((_, cellIndex) => (
                        <div key={cellIndex} className="flex items-center gap-1">
                          <FormField
                            control={form.control}
                            name={`rows.${rowIndex}.cells.${cellIndex}`}
                            render={({ field }) => (
                              <FormItem className="flex-1 min-w-[120px]">
                                <FormControl>
                                  <Input
                                    placeholder={`Column ${String.fromCharCode(65 + cellIndex)}`}
                                    className="h-9"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          {watchRows[rowIndex]?.cells.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeCellFromRow(rowIndex, cellIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => addCellToRow(rowIndex)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {rowsArray.fields.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(watchRows[0]?.cells.length || 2)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Row
                </Button>
              )}

              {/* Preview JSON */}
              {watchRows.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Preview (JSON that will be sent):</p>
                  <code className="text-xs break-all">
                    {parseRowsToJson(watchRows)}
                  </code>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  💡 Tip: Use variables like <code className="text-xs bg-muted px-1 rounded">{"{{trigger.data.name}}"}</code> to insert dynamic values from previous nodes.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Advanced Mode Toggle */}
          {needsValues && (
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm text-muted-foreground">
                  ⚙️ Advanced Mode (Raw JSON)
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Use this if you need full control over the data format. This overrides the visual builder above.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="useAdvancedMode"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="mt-0!">Enable Advanced Mode</FormLabel>
                      </FormItem>
                    )}
                  />

                  {watchUseAdvancedMode && (
                    <FormField
                      control={form.control}
                      name="values"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Values (JSON Array of Arrays)</FormLabel>
                          <FormControl>
                            <Textarea
                              className="font-mono text-sm min-h-[120px]"
                              placeholder='[["Name", "Email", "Phone"], ["John Doe", "john@example.com", "555-1234"]]'
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Each inner array is a row. Example: <code className="text-xs bg-muted px-1 rounded">{`[["{{name}}", "{{email}}"]]`}</code>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <ConfigDialogFooter className="mt-4">
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
