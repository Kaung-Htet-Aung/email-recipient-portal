import {
  LayoutDashboard,
  Boxes,
  Building2,
  Users,
  ListOrdered,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Recipients", icon: Users },
  { href: "/mail-lists", label: "Mailing Lists", icon: ListOrdered },
  { href: "/applications", label: "Applications", icon: Boxes },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
];