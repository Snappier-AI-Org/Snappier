"use client";

import { CredentialType } from "@/generated/prisma";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
    useCreateCredential, 
    useUpdateCredential,
    useSuspenseCredential,
} from "../hooks/use-credentials";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CredentialTypeSelector, 
  credentialTypeOptions,
  isOAuthCredential,
} from "./credential-type-selector";


const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(CredentialType),
  value: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Use the shared OAuth check from integration-categories
const OAUTH_CREDENTIAL_TYPES: CredentialType[] = [
  CredentialType.GOOGLE_DRIVE,
  CredentialType.GOOGLE_SHEETS,
  CredentialType.GMAIL,
  CredentialType.GOOGLE_CALENDAR,
  CredentialType.GOOGLE_DOCS,
  CredentialType.OUTLOOK,
  CredentialType.NOTION,
  CredentialType.GITHUB,
  CredentialType.TODOIST,
  CredentialType.META_INSTAGRAM,
];

interface CredentialFormProps {
  initialData?: {
    id?: string;
    name: string;
    type: CredentialType;
    value: string;
  };
  preselectedType?: CredentialType;
}

export const CredentialForm = ({
    initialData,
    preselectedType,
    }: CredentialFormProps) => {
    const router = useRouter();
    const createCredential = useCreateCredential();
    const updateCredential = useUpdateCredential();
    const { handleError, modal } = useUpgradeModal();

    const isEdit = !!initialData?.id;

    const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
        name: "",
        type: preselectedType || CredentialType.OPENAI,
        value: "",
    },
    });

    const selectedType = form.watch("type");
    const isOAuthType = OAUTH_CREDENTIAL_TYPES.includes(selectedType);
    const selectedOption = credentialTypeOptions.find(opt => opt.value === selectedType);

    const onSubmit = async (values: FormValues) => {
      // For OAuth types, don't allow manual creation
      if (isOAuthType && !isEdit) {
        return;
      }

      // For non-OAuth types, require value
      if (!isOAuthType && !values.value) {
        form.setError("value", { message: "API key is required" });
        return;
      }

      if (isEdit && initialData?.id) {
        await updateCredential.mutateAsync({
          id: initialData.id,
          ...values,
          value: values.value || initialData.value, // Keep existing value if not changed
        });
      } else {
        await createCredential.mutateAsync(
          { ...values, value: values.value || "" },
          {
            onSuccess: (data) => {
              router.push(`/credentials/${data.id}`);
            },
            onError: (error) => {
              handleError(error);
            },
          }
        );
      }
    };

    const handleOAuthConnect = () => {
      if (selectedOption?.connectUrl) {
        window.location.href = selectedOption.connectUrl;
      }
    };

    // Check if this is an OAuth credential that's already connected
    const isOAuthConnected = isEdit && isOAuthType;

    return(
        <>
        {modal}
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle>
                {isEdit ? "Edit Credential" : "Create Credential"}
                </CardTitle>
                <CardDescription>
                {isEdit
                    ? "Update your API key or credential details"
                    : "Add a new API key or credential to your account"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                            <Input 
                              placeholder="My API key" 
                              {...field} 
                              disabled={isOAuthType && !isEdit}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}  
                    />
                    <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Type</FormLabel>
                                <FormControl>
                                  <CredentialTypeSelector
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={isEdit}
                                  />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        {/* OAuth Connect Section */}
                        {isOAuthType && !isEdit && (
                          <div className="space-y-4">
                            <Alert>
                              <AlertDescription>
                                {selectedOption?.label} uses OAuth authentication. Click the button below to connect your account securely.
                              </AlertDescription>
                            </Alert>
                            <Button
                              type="button"
                              onClick={handleOAuthConnect}
                              className="w-full"
                            >
                              <Image
                                src={selectedOption?.logo || ""}
                                alt={selectedOption?.label || ""}
                                width={20}
                                height={20}
                                className="mr-2"
                              />
                              Connect with {selectedOption?.label}
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* OAuth Connected Status */}
                        {isOAuthConnected && (
                          <Alert className="border-[#0021F3]/20 bg-[#0021F3]/5 dark:bg-[#0021F3]/10 dark:border-[#5C70EA]/30">
                            <CheckCircle2 className="h-4 w-4 text-[#0021F3] dark:text-[#5C70EA]" />
                            <AlertDescription className="text-[#0021F3] dark:text-[#5C70EA]">
                              Your {selectedOption?.label} account is connected. You can update the name or disconnect below.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Trello special fields - API Key + Token */}
                        {selectedType === CredentialType.TRELLO && (
                          <>
                            <FormField
                              control={form.control}
                              name="value"
                              render={({ field }) => {
                                // Parse existing JSON value for edit mode
                                let apiKey = "";
                                let token = "";
                                try {
                                  const parsed = JSON.parse(field.value || "{}");
                                  apiKey = parsed.apiKey || "";
                                  token = parsed.token || "";
                                } catch {
                                  // Not valid JSON, use as-is
                                }

                                const updateValue = (key: string, val: string) => {
                                  try {
                                    const current = JSON.parse(field.value || "{}");
                                    current[key] = val;
                                    field.onChange(JSON.stringify(current));
                                  } catch {
                                    field.onChange(JSON.stringify({ [key]: val }));
                                  }
                                };

                                return (
                                  <>
                                    <FormItem>
                                      <FormLabel>API Key</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="password"
                                          placeholder="Your Trello API Key"
                                          value={apiKey}
                                          onChange={(e) => updateValue("apiKey", e.target.value)}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Get your API key from{" "}
                                        <a 
                                          href="https://trello.com/power-ups/admin" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary underline"
                                        >
                                          trello.com/power-ups/admin
                                        </a>
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                    <FormItem>
                                      <FormLabel>Token</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="password"
                                          placeholder="Your Trello Token"
                                          value={token}
                                          onChange={(e) => updateValue("token", e.target.value)}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Generate a token by clicking &quot;Generate a Token&quot; on the API key page. Grant read/write access.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  </>
                                );
                              }}
                            />
                          </>
                        )}

                        {/* API Key field - only for non-OAuth types (excluding Trello) */}
                        {!isOAuthType && selectedType !== CredentialType.TRELLO && (
                          <FormField
                              control={form.control}
                              name="value"
                              render={({ field }) => (
                              <FormItem>
                                  <FormLabel>API key</FormLabel>
                                      <FormControl>
                                          <Input
                                          type="password"
                                          placeholder="sk-..."
                                          {...field}
                                          />
                                      </FormControl>
                                  <FormDescription>
                                    Your API key will be encrypted and stored securely.
                                  </FormDescription>
                                  <FormMessage />
                              </FormItem>
                              )}
                          />   
                        )}

                        <div className="flex gap-4">
                            {/* Show save button only for non-OAuth or edit mode */}
                            {(!isOAuthType || isEdit) && (
                              <Button
                                  type="submit"
                                  disabled={ 
                                  createCredential.isPending || 
                                  updateCredential.isPending
                              }
                                  >
                                  {isEdit ? "Update" : "Create"}
                              </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                            >
                                <Link href="/credentials" prefetch>Cancel</Link>
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
        </>
    )
};

export const CredentialView = ({
    credentialId,
}: {
    credentialId: string
}) => {
  const { data: credential } = useSuspenseCredential(credentialId);

  return <CredentialForm initialData={credential} />;
};