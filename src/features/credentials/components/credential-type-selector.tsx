"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CredentialType } from "@/generated/prisma";
import {
  CREDENTIAL_CATEGORY_MAP,
  INTEGRATION_CATEGORIES,
  getCredentialCategories,
  isOAuthCredential,
  type IntegrationCategoryId,
} from "@/config/integration-categories";

// ============================================================================
// CREDENTIAL TYPE OPTIONS WITH CATEGORIES
// ============================================================================

export interface CredentialTypeOption {
  value: CredentialType;
  label: string;
  logo: string;
  isOAuth: boolean;
  connectUrl?: string;
  category: IntegrationCategoryId;
}

export const credentialTypeOptions: CredentialTypeOption[] = [
  // === AI ===
  {
    value: CredentialType.OPENAI,
    label: "OpenAI",
    logo: "/logos/openai.svg",
    isOAuth: false,
    category: "ai",
  },
  {
    value: CredentialType.ANTHROPIC,
    label: "Anthropic",
    logo: "/logos/anthropic.svg",
    isOAuth: false,
    category: "ai",
  },
  {
    value: CredentialType.GEMINI,
    label: "Gemini",
    logo: "/logos/gemini.svg",
    isOAuth: false,
    category: "ai",
  },
  {
    value: CredentialType.GROQ,
    label: "Groq",
    logo: "/logos/groq.svg",
    isOAuth: false,
    category: "ai",
  },
  {
    value: CredentialType.HUGGINGFACE,
    label: "Hugging Face",
    logo: "/logos/huggingface.svg",
    isOAuth: false,
    category: "ai",
  },
  {
    value: CredentialType.OPENROUTER,
    label: "OpenRouter",
    logo: "/logos/openrouter.png",
    isOAuth: false,
    category: "ai",
  },

  // === COMMUNICATION ===
  {
    value: CredentialType.GMAIL,
    label: "Gmail",
    logo: "/logos/gmail.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/gmail/connect",
    category: "communication",
  },
  {
    value: CredentialType.OUTLOOK,
    label: "Outlook",
    logo: "/logos/outlook.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/outlook/connect",
    category: "communication",
  },
  {
    value: CredentialType.META_INSTAGRAM,
    label: "Instagram",
    logo: "/logos/instagram.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/meta-instagram/connect",
    category: "communication",
  },

  // === DATA ===
  {
    value: CredentialType.GOOGLE_SHEETS,
    label: "Google Sheets",
    logo: "/logos/google-sheets.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/google-sheets/connect",
    category: "data",
  },
  {
    value: CredentialType.GOOGLE_DRIVE,
    label: "Google Drive",
    logo: "/logos/google-drive.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/google-drive/connect",
    category: "data",
  },
  {
    value: CredentialType.GOOGLE_CALENDAR,
    label: "Google Calendar",
    logo: "/logos/google-calendar.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/google-calendar/connect",
    category: "data",
  },
  {
    value: CredentialType.GOOGLE_DOCS,
    label: "Google Docs",
    logo: "/logos/google-docs.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/google-docs/connect",
    category: "data",
  },

  // === PRODUCTIVITY ===
  {
    value: CredentialType.TRELLO,
    label: "Trello",
    logo: "/logos/trello.svg",
    isOAuth: false,
    category: "productivity",
  },
  {
    value: CredentialType.NOTION,
    label: "Notion",
    logo: "/logos/notion.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/notion/connect",
    category: "productivity",
  },
  {
    value: CredentialType.GITHUB,
    label: "GitHub",
    logo: "/logos/github.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/github/connect",
    category: "productivity",
  },
  {
    value: CredentialType.TODOIST,
    label: "Todoist",
    logo: "/logos/todoist.svg",
    isOAuth: true,
    connectUrl: "/api/integrations/todoist/connect",
    category: "productivity",
  },
];

// ============================================================================
// FILTER TYPES
// ============================================================================

type FilterType = "all" | "oauth" | "api-key" | IntegrationCategoryId;

interface FilterOption {
  id: FilterType;
  label: string;
}

const filterOptions: FilterOption[] = [
  { id: "all", label: "All" },
  { id: "oauth", label: "OAuth" },
  { id: "api-key", label: "API Key" },
];

// ============================================================================
// CREDENTIAL TYPE SELECTOR COMPONENT
// ============================================================================

interface CredentialTypeSelectorProps {
  value: CredentialType;
  onChange: (value: CredentialType) => void;
  disabled?: boolean;
}

export const CredentialTypeSelector = ({
  value,
  onChange,
  disabled,
}: CredentialTypeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const selectedOption = credentialTypeOptions.find((opt) => opt.value === value);
  const categories = getCredentialCategories();

  // Filter options based on search and active filter
  const filteredOptions = useMemo(() => {
    let options = credentialTypeOptions;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      options = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(term) ||
          opt.category.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (activeFilter === "oauth") {
      options = options.filter((opt) => opt.isOAuth);
    } else if (activeFilter === "api-key") {
      options = options.filter((opt) => !opt.isOAuth);
    } else if (activeFilter !== "all") {
      // Filter by category
      options = options.filter((opt) => opt.category === activeFilter);
    }

    return options;
  }, [searchTerm, activeFilter]);

  // Group filtered options by category
  const groupedOptions = useMemo(() => {
    const groups: Record<IntegrationCategoryId, CredentialTypeOption[]> = {
      triggers: [],
      logic: [],
      ai: [],
      communication: [],
      data: [],
      productivity: [],
      developer: [],
    };

    filteredOptions.forEach((opt) => {
      if (groups[opt.category]) {
        groups[opt.category].push(opt);
      }
    });

    // Filter out empty categories
    return Object.entries(groups)
      .filter(([_, options]) => options.length > 0)
      .map(([categoryId, options]) => ({
        category: INTEGRATION_CATEGORIES[categoryId as IntegrationCategoryId],
        options,
      }));
  }, [filteredOptions]);

  const handleSelect = useCallback(
    (credentialType: CredentialType) => {
      onChange(credentialType);
      setOpen(false);
      setSearchTerm("");
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-10"
        >
          {selectedOption ? (
            <div className="flex items-center gap-2">
              <Image
                src={selectedOption.logo}
                alt={selectedOption.label}
                width={16}
                height={16}
              />
              <span>{selectedOption.label}</span>
              {selectedOption.isOAuth && (
                <span className="text-xs text-muted-foreground">(OAuth)</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Select credential type...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        {/* Search Input */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search credentials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 p-2 border-b border-border overflow-x-auto">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
          <div className="h-4 w-px bg-border mx-1 self-center" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveFilter(cat.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors flex items-center gap-1",
                activeFilter === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Options List */}
        <ScrollArea className="h-[300px]">
          {groupedOptions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No credentials match your search
            </div>
          ) : (
            <div className="p-2">
              {groupedOptions.map(({ category, options }) => (
                <div key={category.id} className="mb-3 last:mb-0">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 px-2 py-1.5 sticky top-0 bg-popover">
                    <category.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category.label}
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      ({options.length})
                    </span>
                  </div>

                  {/* Category Options */}
                  {options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        value === option.value
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-accent"
                      )}
                    >
                      <div className="h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center shrink-0">
                        <Image
                          src={option.logo}
                          alt={option.label}
                          width={18}
                          height={18}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{option.label}</div>
                      </div>
                      {option.isOAuth && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          OAuth
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

// Export the options for use in other components
export { isOAuthCredential };
