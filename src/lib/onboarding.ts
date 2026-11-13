export const PROXY_USE_CASES = [
  {
    value: "social_media",
    label: "Social media",
    description: "Manage accounts and campaigns",
  },
  {
    value: "scraping",
    label: "Data collection",
    description: "Scraping and research at scale",
  },
  {
    value: "business",
    label: "Business",
    description: "Marketing and operations",
  },
  {
    value: "automation",
    label: "Automation",
    description: "Connect tools and workflows",
  },
  {
    value: "research",
    label: "Research",
    description: "Private, reliable browsing",
  },
  {
    value: "other",
    label: "Something else",
    description: "Tell us later if needed",
  },
] as const;

export type ProxyUseCase = (typeof PROXY_USE_CASES)[number]["value"];
export const PROXY_USE_CASE_VALUES = PROXY_USE_CASES.map((item) => item.value) as [
  ProxyUseCase,
  ...ProxyUseCase[],
];
