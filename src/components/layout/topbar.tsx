import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { NavGroupList } from "@/components/layout/nav-group-list";
import { filterNavGroupsByRole, navGroups, resolveNavTrail } from "@/components/layout/nav-items";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette } from "@/components/shared/command-palette";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-context";

type TopbarProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
};

export const Topbar = ({ collapsed, onToggleSidebar }: TopbarProps) => {
  const { session, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const trail = resolveNavTrail(location.pathname);
  const currentItemTitle = trail?.child?.title ?? trail?.item.title ?? "nav.overview";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-4 z-10 flex flex-col gap-3 rounded-[0.9rem] border border-[var(--topbar-border)] bg-[var(--topbar)] px-3 py-3 shadow-[var(--shadow-topbar)] backdrop-blur md:flex-row md:items-center md:justify-between md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(92vw,24rem)] p-0">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <DialogTitle className="text-base">{t("common.navigation")}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-[var(--muted-foreground)]">
                Navega por BarberShop.
              </DialogDescription>
            </div>
            <nav className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
              <NavGroupList
                groups={filterNavGroupsByRole(navGroups, session?.user.role)}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </nav>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        <div className="relative hidden flex-1 md:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <Button
            variant="outline"
            onClick={() => setPaletteOpen(true)}
            aria-label={t("common.search")}
            className="h-10 w-full justify-start gap-2 pl-9 pr-3 font-normal text-[var(--muted-foreground)]"
          >
            <span className="flex-1 text-left">{t("common.search")}</span>
            <kbd className="rounded border border-[var(--border)] bg-[var(--surface-panel)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]">
              ⌘K
            </kbd>
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPaletteOpen(true)}
            aria-label={t("common.search")}
          >
            <Search className="h-4 w-4" />
          </Button>
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {t(currentItemTitle)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 transition-colors hover:bg-[var(--surface-panel)]"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {(session?.user.name || session?.user.email || "").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium leading-none">
                  {session?.user.name || session?.user.email}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{session?.user.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{session?.user.organization || "—"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()}>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
};
