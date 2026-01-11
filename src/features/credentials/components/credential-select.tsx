"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CredentialType } from "@/generated/prisma";
import { useCredentialsByType } from "../hooks/use-credentials";

// Credential type configuration with logos and labels
const credentialTypeConfig: Record<
  CredentialType,
  { label: string; logo: string }
> = {
  [CredentialType.OPENAI]: {
    label: "OpenAI",
    logo: "/logos/openai.svg",
  },
  [CredentialType.ANTHROPIC]: {
    label: "Anthropic",
    logo: "/logos/anthropic.svg",
  },
  [CredentialType.GEMINI]: {
    label: "Gemini",
    logo: "/logos/gemini.svg",
  },
  [CredentialType.GROQ]: {
    label: "Groq",
    logo: "/logos/groq.svg",
  },
  [CredentialType.HUGGINGFACE]: {
    label: "Hugging Face",
    logo: "/logos/huggingface.svg",
  },
  [CredentialType.OPENROUTER]: {
    label: "OpenRouter",
    logo: "/logos/openrouter.png",
  },
  [CredentialType.GOOGLE_SHEETS]: {
    label: "Google Sheets",
    logo: "/logos/google-sheets.svg",
  },
  [CredentialType.GOOGLE_DRIVE]: {
    label: "Google Drive",
    logo: "/logos/google-drive.svg",
  },
  [CredentialType.GMAIL]: {
    label: "Gmail",
    logo: "/logos/gmail.svg",
  },
  [CredentialType.GOOGLE_CALENDAR]: {
    label: "Google Calendar",
    logo: "/logos/google-calendar.svg",
  },
  [CredentialType.GOOGLE_DOCS]: {
    label: "Google Docs",
    logo: "/logos/google-docs.svg",
  },
  [CredentialType.TRELLO]: {
    label: "Trello",
    logo: "/logos/trello.svg",
  },
  [CredentialType.OUTLOOK]: {
    label: "Outlook",
    logo: "/logos/outlook.svg",
  },
  [CredentialType.NOTION]: {
    label: "Notion",
    logo: "/logos/notion.svg",
  },
  [CredentialType.GITHUB]: {
    label: "GitHub",
    logo: "/logos/github.svg",
  },
  [CredentialType.DISCORD]: {
    label: "Discord",
    logo: "/logos/discord.svg",
  },
  [CredentialType.META_INSTAGRAM]: {
    label: "Instagram",
    logo: "/logos/instagram.svg",
  },
  [CredentialType.TWILIO]: {
    label: "Twilio",
    logo: "/logos/twilio.svg",
  },
  [CredentialType.SENDGRID]: {
    label: "SendGrid",
    logo: "/logos/sendgrid.svg",
  },
  [CredentialType.AIRTABLE]: {
    label: "Airtable",
    logo: "/logos/airtable.svg",
  },
  [CredentialType.SUPABASE]: {
    label: "Supabase",
    logo: "/logos/supabase.svg",
  },
  [CredentialType.MYSQL]: {
    label: "MySQL",
    logo: "/logos/mysql.svg",
  },
  [CredentialType.POSTGRES]: {
    label: "PostgreSQL",
    logo: "/logos/postgres.svg",
  },
  [CredentialType.MONGODB]: {
    label: "MongoDB",
    logo: "/logos/mongodb.svg",
  },
  [CredentialType.REDIS]: {
    label: "Redis",
    logo: "/logos/redis.svg",
  },
  [CredentialType.HUBSPOT]: {
    label: "HubSpot",
    logo: "/logos/hubspot.svg",
  },
  [CredentialType.SALESFORCE]: {
    label: "Salesforce",
    logo: "/logos/salesforce.svg",
  },
  [CredentialType.PIPEDRIVE]: {
    label: "Pipedrive",
    logo: "/logos/pipedrive.svg",
  },
  [CredentialType.JIRA]: {
    label: "Jira",
    logo: "/logos/jira.svg",
  },
  [CredentialType.CLICKUP]: {
    label: "ClickUp",
    logo: "/logos/clickup.svg",
  },
  [CredentialType.TODOIST]: {
    label: "Todoist",
    logo: "/logos/todoist.svg",
  },
  [CredentialType.ASANA]: {
    label: "Asana",
    logo: "/logos/asana.svg",
  },
  [CredentialType.LINEAR]: {
    label: "Linear",
    logo: "/logos/linear.svg",
  },
  [CredentialType.TWITTER]: {
    label: "Twitter",
    logo: "/logos/twitter.svg",
  },
  [CredentialType.AWS]: {
    label: "AWS",
    logo: "/logos/aws.svg",
  },
  [CredentialType.DROPBOX]: {
    label: "Dropbox",
    logo: "/logos/dropbox.svg",
  },
  [CredentialType.MICROSOFT]: {
    label: "Microsoft",
    logo: "/logos/microsoft.svg",
  },
  [CredentialType.TELEGRAM]: {
    label: "Telegram",
    logo: "/logos/telegram.svg",
  },
  [CredentialType.WHATSAPP]: {
    label: "WhatsApp",
    logo: "/logos/whatsapp.svg",
  },
  [CredentialType.TYPEFORM]: {
    label: "Typeform",
    logo: "/logos/typeform.svg",
  },
  [CredentialType.PAYPAL]: {
    label: "PayPal",
    logo: "/logos/paypal.svg",
  },
};

interface CredentialSelectProps {
  type: CredentialType;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const CredentialSelect = ({
  type,
  value,
  onChange,
  disabled,
  placeholder = "Select a credential",
}: CredentialSelectProps) => {
  const router = useRouter();
  const { data: credentials, isLoading } = useCredentialsByType(type);

  const config = credentialTypeConfig[type];
  const ADD_NEW_VALUE = "__add_new__";

  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === ADD_NEW_VALUE) {
      // Navigate to credentials page with preselected type
      router.push(`/credentials/new?type=${type}`);
      return;
    }
    onChange(selectedValue);
  };

  return (
    <Select
      onValueChange={handleValueChange}
      value={value}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            Loading credentials...
          </div>
        ) : (
          <>
            {credentials && credentials.length > 0 ? (
              credentials.map((credential) => (
                <SelectItem key={credential.id} value={credential.id}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={config.logo}
                      alt={config.label}
                      width={16}
                      height={16}
                    />
                    {credential.name}
                  </div>
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No {config.label} credentials found
              </div>
            )}
            <SelectSeparator />
            <SelectItem value={ADD_NEW_VALUE}>
              <div className="flex items-center gap-2 text-primary">
                <Plus className="h-4 w-4" />
                Add new {config.label} credential
              </div>
            </SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
};
