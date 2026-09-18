import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  BookMarked,
  Calculator,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Layers,
  Menu,
  Moon,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";
import { useAppStore } from "@/stores/appStore";
import { useSetting } from "@/stores/settingsStore";
import { SETTINGS } from "@/app/settingsKeys";
import { PROFILE_MODULES, type ModuleId } from "@/app/modules";
import { StatusBar } from "./StatusBar";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
  module?: ModuleId;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: Home, end: true },
  { to: "/timetable", labelKey: "nav.timetable", icon: CalendarDays, module: "timetable" },
  { to: "/tasks", labelKey: "nav.tasks", icon: CheckSquare, module: "tasks" },
  { to: "/exams", labelKey: "nav.exams", icon: GraduationCap, module: "exams" },
  { to: "/subjects", labelKey: "nav.subjects", icon: BookMarked, module: "subjects" },
  { to: "/notes", labelKey: "nav.notes", icon: NotebookPen, module: "notes" },
  { to: "/flashcards", labelKey: "nav.flashcards", icon: Layers, module: "flashcards" },
  { to: "/grades", labelKey: "nav.grades", icon: BookOpen, module: "grades" },
  { to: "/files", labelKey: "nav.files", icon: FolderOpen, module: "files" },
  { to: "/documents", labelKey: "nav.documents", icon: FileText, module: "documents" },
  { to: "/tools", labelKey: "nav.tools", icon: Calculator, module: "tools" },
];

/** Nav items visible for the current profile / module settings. */
export function useVisibleNavItems(): NavItem[] {
  const profile = useAppStore((s) => s.profile);
  const enabled = useSetting<ModuleId[] | null>(SETTINGS.modulesVisible, null);
  const gradesEnabled = useSetting<boolean>(SETTINGS.gradesEnabled, true);
  const visible = new Set(enabled ?? PROFILE_MODULES[profile]);
  return NAV_ITEMS.filter((i) => !i.module || (visible.has(i.module) && (i.module !== "grades" || gradesEnabled)));
}

function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const isDark = document.documentElement.classList.contains("dark");
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("theme.toggle")}
      title={t("theme.toggle")}
      onClick={() => setTheme(theme === "system" ? (isDark ? "light" : "dark") : theme === "dark" ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const items = useVisibleNavItems();
  return (
    <nav aria-label={t("nav.menu")} className="flex flex-1 flex-col gap-1 p-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          title={collapsed ? t(item.labelKey) : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
              isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              collapsed && "justify-center px-2",
            )
          }
        >
          <item.icon className="size-4 shrink-0" aria-hidden />
          {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
        </NavLink>
      ))}
      <div className="mt-auto">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          title={collapsed ? t("nav.settings") : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
              isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              collapsed && "justify-center px-2",
            )
          }
        >
          <Settings className="size-4 shrink-0" aria-hidden />
          {!collapsed && <span>{t("nav.settings")}</span>}
        </NavLink>
      </div>
    </nav>
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex transition-[width]",
            collapsed ? "w-14" : "w-56",
          )}
        >
          <div className={cn("flex h-12 items-center gap-2 border-b border-sidebar-border px-3", collapsed && "justify-center px-0")}>
            <GraduationCap className="size-5 text-primary" aria-hidden />
            {!collapsed && <span className="font-semibold">{t("app.name")}</span>}
          </div>
          <SidebarNav collapsed={collapsed} />
          <div className="border-t border-sidebar-border p-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="w-full"
              onClick={toggleSidebar}
              aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label={t("nav.menu")}>
            <button className="absolute inset-0 bg-black/50" aria-label={t("common.close")} onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
              <div className="flex h-12 items-center gap-2 border-b border-sidebar-border px-3">
                <GraduationCap className="size-5 text-primary" aria-hidden />
                <span className="font-semibold">{t("app.name")}</span>
              </div>
              <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.menu")} onClick={() => setMobileOpen(true)}>
              <Menu />
            </Button>
            <div className="flex-1" />
            <ThemeToggle />
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
