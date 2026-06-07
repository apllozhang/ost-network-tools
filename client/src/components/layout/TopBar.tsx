import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Bell, Search, LogOut } from "lucide-react";

interface TopBarProps {
  onMenuClick: () => void;
  isMobile: boolean;
}

function useBreadcrumbMap(): Record<string, string> {
  const { t } = useTranslation();
  return {
    "/": t("nav.dashboard"),
    "/devices": t("nav.devices"),
    "/alerts": t("nav.alerts"),
    "/tools": t("nav.tools"),
    "/connect": t("nav.connect"),
    "/poe": t("nav.poe"),
    "/tdr": t("nav.tdr"),
    "/vlan": t("nav.vlan"),
    "/snmp": t("nav.snmp"),
    "/traffic": t("nav.traffic"),
    "/log": t("nav.log"),
    "/firmware": t("nav.firmware"),
    "/search": t("nav.search"),
    "/audit": t("nav.audit"),
    "/login": t("auth.title"),
  };
}

export default function TopBar({ onMenuClick, isMobile }: TopBarProps) {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const breadcrumbMap = useBreadcrumbMap();

  const { data: user } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setLocation("/login");
    },
  });

  const breadcrumb = breadcrumbMap[location] ?? "";

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {breadcrumb && !isMobile && (
        <span className="text-sm font-medium text-muted-foreground">
          {breadcrumb}
        </span>
      )}

      <div className="flex-1" />

      <div className={cn("relative", isMobile && "flex-1")}>
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("nav.placeholder")}
          className={cn("h-8 pl-8", isMobile ? "w-full" : "w-64")}
          readOnly
        />
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative" aria-label={t("topbar.notifications")}>
          <Bell className="h-4 w-4" />
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
          >
            0
          </Badge>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {user?.displayName?.slice(0, 2).toUpperCase() ??
                    user?.username?.slice(0, 2).toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm font-medium">
                  {user?.displayName ?? user?.username ?? ""}
                </span>
                {user?.role && (
                  <span className="text-xs text-muted-foreground">
                    {user.role}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("topbar.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
