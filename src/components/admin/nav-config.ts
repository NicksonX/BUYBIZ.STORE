import {
  ArrowLeftRight,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  FileClock,
  Gift,
  KeyRound,
  Landmark,
  Bell,
  Snowflake,
  Mail,
  LayoutDashboard,
  LifeBuoy,
  Network,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  group: string;
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, group: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, group: "Dashboard" },
  { href: "/admin/users", label: "Users", icon: Users, group: "Operations" },
  { href: "/admin/ai-proxy", label: "AI Proxy Assistant", icon: Sparkles, group: "Operations" },
  { href: "/admin/inventory", label: "Proxy inventory", icon: Package, group: "Operations" },
  { href: "/admin/rotation", label: "Credential rotation", icon: KeyRound, group: "Operations" },
  { href: "/admin/inactivity", label: "Inactivity", icon: Snowflake, group: "Operations" },
  { href: "/admin/allocations", label: "Allocations", icon: Network, group: "Operations" },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText, group: "Operations" },
  { href: "/admin/deposits", label: "Deposits", icon: CreditCard, group: "Operations" },
  { href: "/admin/ledger", label: "Wallet ledger", icon: ArrowLeftRight, group: "Finance" },
  { href: "/admin/adjustments", label: "Refunds & credits", icon: BadgeDollarSign, group: "Finance" },
  { href: "/admin/expenses", label: "Expenses", icon: Landmark, group: "Finance" },
  { href: "/admin/referrals", label: "Referral rewards", icon: Gift, group: "Finance" },
  { href: "/admin/campaigns", label: "Campaigns & USD rewards", icon: Gift, group: "Finance" },
  { href: "/admin/ambassador-payouts", label: "Ambassador payouts", icon: BadgeDollarSign, group: "Finance" },
  { href: "/admin/support", label: "Support", icon: LifeBuoy, group: "Support" },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, group: "System" },
  { href: "/admin/emails", label: "Email management", icon: Mail, group: "System" },
  { href: "/admin/products", label: "Products & pricing", icon: Boxes, group: "System" },
  { href: "/admin/audit", label: "Audit log", icon: FileClock, group: "System" },
  { href: "/admin/settings", label: "Settings", icon: Settings, group: "System" },
];

export const adminNavGroups = Array.from(new Set(adminNav.map((item) => item.group)));

export function isAdminNavActive(pathname: string, item: AdminNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export const supportOnlyNav: AdminNavItem[] = [
  {
    href: "/admin/support",
    label: "Support",
    icon: LifeBuoy,
    group: "Support",
  },
];

export const adminShieldIcon = ShieldCheck;
export const adminClipboardIcon = ClipboardList;
