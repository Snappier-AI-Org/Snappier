import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  createLoader,
} from "nuqs/server";

export const templatesParams = {
  page: parseAsInteger.withDefault(1),
  search: parseAsString.withDefault(""),
  category: parseAsStringLiteral([
    "all",
    "AUTOMATION",
    "MARKETING",
    "SALES",
    "SUPPORT",
    "SOCIAL_MEDIA",
    "AI_ASSISTANT",
    "DATA_SYNC",
    "NOTIFICATIONS",
    "OTHER",
  ] as const).withDefault("all"),
  visibility: parseAsStringLiteral([
    "all",
    "PRIVATE",
    "PUBLIC",
    "MARKETPLACE",
  ] as const).withDefault("all"),
};

export const templatesParamsLoader = createLoader(templatesParams);

export const marketplaceParams = {
  page: parseAsInteger.withDefault(1),
  search: parseAsString.withDefault(""),
  category: parseAsStringLiteral([
    "all",
    "AUTOMATION",
    "MARKETING",
    "SALES",
    "SUPPORT",
    "SOCIAL_MEDIA",
    "AI_ASSISTANT",
    "DATA_SYNC",
    "NOTIFICATIONS",
    "OTHER",
  ] as const).withDefault("all"),
  priceFilter: parseAsStringLiteral([
    "all",
    "free",
    "paid",
  ] as const).withDefault("all"),
};

export const marketplaceParamsLoader = createLoader(marketplaceParams);

