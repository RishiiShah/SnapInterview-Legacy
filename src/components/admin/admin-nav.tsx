import {
  IconChartBars,
  IconCode,
  IconDashboard,
  IconQuestionBank,
  IconRecordings,
  IconUserCheck,
} from "@/components/ui/icons";

export const adminNavItems = [
  {
    label: "Overview",
    href: "/admin",
    icon: <IconDashboard className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: <IconUserCheck className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Questions",
    href: "/admin/questions",
    icon: <IconQuestionBank className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Coding",
    href: "/admin/coding",
    icon: <IconCode className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Interviews",
    href: "/admin/interviews",
    icon: <IconRecordings className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: <IconChartBars className="h-5 w-5 shrink-0" />,
  },
] as const;

export function getAdminPageTitle(pathname: string): string {
  if (pathname === "/admin") return "Overview";
  if (pathname.startsWith("/admin/analytics")) return "Analytics";
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname.startsWith("/admin/questions")) return "Questions";
  if (pathname.startsWith("/admin/coding")) return "Coding";
  if (/^\/admin\/interviews\/[^/]+$/.test(pathname)) return "Interview detail";
  if (pathname.startsWith("/admin/interviews")) return "Interviews";
  return "Admin";
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
