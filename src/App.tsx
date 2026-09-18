import { createHashRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

// Hash routing works identically under the Vite dev server, the Tauri
// production protocol and Playwright, so no server-side fallback is needed.
const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "timetable", element: <PlaceholderPage titleKey="nav.timetable" /> },
      { path: "tasks", element: <PlaceholderPage titleKey="nav.tasks" /> },
      { path: "exams", element: <PlaceholderPage titleKey="nav.exams" /> },
      { path: "notes", element: <PlaceholderPage titleKey="nav.notes" /> },
      { path: "flashcards", element: <PlaceholderPage titleKey="nav.flashcards" /> },
      { path: "grades", element: <PlaceholderPage titleKey="nav.grades" /> },
      { path: "files", element: <PlaceholderPage titleKey="nav.files" /> },
      { path: "documents", element: <PlaceholderPage titleKey="nav.documents" /> },
      { path: "tools", element: <PlaceholderPage titleKey="nav.tools" /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-right" closeButton />
    </TooltipProvider>
  );
}
