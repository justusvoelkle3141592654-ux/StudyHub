import { createHashRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { SubjectsPage } from "@/features/subjects/SubjectsPage";
import { TimetablePage } from "@/features/timetable/TimetablePage";
import { TasksPage } from "@/features/tasks/TasksPage";
import { ExamsPage } from "@/features/exams/ExamsPage";
import { NotesPage } from "@/features/notes/NotesPage";
import { FlashcardsPage } from "@/features/flashcards/FlashcardsPage";
import { DeckPage } from "@/features/flashcards/DeckPage";
import { StudySession } from "@/features/flashcards/StudySession";
import { GradesPage, SubjectGradesPage } from "@/features/grades/GradesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { AppShell } from "@/app/AppShell";
import { SetupWizard } from "@/features/setup/SetupWizard";
import { useAppStore } from "@/stores/appStore";

// Hash routing works identically under the Vite dev server, the Tauri
// production protocol and Playwright, so no server-side fallback is needed.
/** Redirects to the wizard until the first-run setup has been completed. */
function RequireSetup() {
  const done = useAppStore((s) => s.setupCompleted);
  return done ? <Outlet /> : <Navigate to="/setup" replace />;
}

const router = createHashRouter([
  { path: "/setup", element: <SetupWizard /> },
  {
    path: "/",
    element: <RequireSetup />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "timetable", element: <TimetablePage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "exams", element: <ExamsPage /> },
      { path: "subjects", element: <SubjectsPage /> },
      { path: "notes", element: <NotesPage /> },
      { path: "notes/:id", element: <NotesPage /> },
      { path: "flashcards", element: <FlashcardsPage /> },
      { path: "flashcards/study", element: <StudySession /> },
      { path: "flashcards/:deckId", element: <DeckPage /> },
      { path: "flashcards/:deckId/study", element: <StudySession /> },
      { path: "grades", element: <GradesPage /> },
      { path: "grades/:subjectId", element: <SubjectGradesPage /> },
      { path: "files", element: <PlaceholderPage titleKey="nav.files" /> },
      { path: "documents", element: <PlaceholderPage titleKey="nav.documents" /> },
      { path: "tools", element: <PlaceholderPage titleKey="nav.tools" /> },
      { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <AppShell>
        <RouterProvider router={router} />
      </AppShell>
      <Toaster richColors position="bottom-right" closeButton />
    </TooltipProvider>
  );
}
