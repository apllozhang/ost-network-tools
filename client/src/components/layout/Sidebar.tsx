import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Monitor,
  AlertTriangle,
  Wrench,
  Plug,
  Zap,
  Cable,
  Network,
  Shield,
  Activity,
  FileText,
  HardDrive,
  Search,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

interface MenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

function useMenuGroups(): MenuGroup[] {
  const { t } = useTranslation();

  return [
    {
      label: t("nav.group.dashboard"),
      items: [
        { href: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
      ],
    },
    {
      label: t("nav.group.devices"),
      items: [
        { href: "/devices", icon: Monitor, label: t("nav.devices") },
      ],
    },
    {
      label: t("nav.group.alerts"),
      items: [
        { href: "/alerts", icon: AlertTriangle, label: t("nav.alerts") },
      ],
    },
    {
      label: t("nav.group.tools"),
      items: [
        { href: "/tools", icon: Wrench, label: t("nav.tools") },
      ],
    },
    {
      label: t("nav.group.aos"),
      items: [
        { href: "/connect", icon: Plug, label: t("nav.connect") },
        { href: "/poe", icon: Zap, label: t("nav.poe") },
        { href: "/tdr", icon: Cable, label: t("nav.tdr") },
        { href: "/vlan", icon: Network, label: t("nav.vlan") },
        { href: "/snmp", icon: Shield, label: t("nav.snmp") },
        { href: "/traffic", icon: Activity, label: t("nav.traffic") },
        { href: "/log", icon: FileText, label: t("nav.log") },
        { href: "/firmware", icon: HardDrive, label: t("nav.firmware") },
        { href: "/search", icon: Search, label: t("nav.search") },
      ],
    },
    {
      label: t("nav.group.admin"),
      items: [
        { href: "/audit", icon: ClipboardList, label: t("nav.audit") },
      ],
    },
  ];
}

interface SidebarProps {
  collapsed: boolean;
  className?: string;
}

export default function Sidebar({ collapsed, className }: SidebarProps) {
  const [location] = useLocation();
  const menuGroups = useMenuGroups();

  return (
    <ScrollArea className={cn("h-full", className)}>
      <nav className="flex flex-col gap-1 p-2">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;

              const link = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <span key={item.href}>{link}</span>
              );
            })}
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}
