import {
  ArrowLeftRight,
  LayoutDashboard,
  LifeBuoy,
  Network,
  ReceiptText,
  Settings,
  Store,
  Wallet,
  Gift,
  Megaphone,
  BadgeDollarSign,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const customerNav: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: Store },
  { href: "/dashboard/proxies", label: "My proxies", icon: Network },
  { href: "/dashboard/orders", label: "My orders", icon: ReceiptText },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/referrals", label: "Referral", icon: Gift },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/rewards", label: "Rewards", icon: BadgeDollarSign },
  { href: "/dashboard/giveaways", label: "Giveaways", icon: PartyPopper },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function isNavActive(pathname: string, item: DashboardNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
