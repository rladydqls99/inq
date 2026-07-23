import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import { PinGate } from "@/features/auth/PinGate";
import { PwaInstallPrompt } from "@/shared/ui/PwaInstallPrompt";
import { ChallengeDetailPage } from "@/pages/challenges/ChallengeDetailPage";
import { ChallengeListPage } from "@/pages/challenges/ChallengeListPage";
import { HomePage } from "@/pages/challenges/HomePage";
import { CardEditPage } from "@/pages/decks/CardEditPage";
import { DeckDetailPage } from "@/pages/decks/DeckDetailPage";
import { DeckListPage } from "@/pages/decks/DeckListPage";
import { ChallengeRunnerPage } from "@/pages/challenges/ChallengeRunnerPage";
import { DeckRunnerPage } from "@/pages/decks/DeckRunnerPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { UploadPage } from "@/pages/upload/UploadPage";
import { DesktopUploadLayout } from "@/widgets/mobile-shell/DesktopUploadLayout";
import { MobileAppShell } from "@/widgets/mobile-shell/MobileAppShell";

const router = createBrowserRouter([
  {
    element: <AuthenticatedRoutes />,
    children: [
      {
        element: <MobileAppShell />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/challenges", element: <ChallengeListPage /> },
          {
            path: "/challenges/:challengeId/cards",
            element: <ChallengeDetailPage />,
          },
          {
            path: "/challenges/:challengeId/run",
            element: <ChallengeRunnerPage />,
          },
          { path: "/decks", element: <DeckListPage /> },
          {
            path: "/decks/:deckId/manage",
            element: <DeckDetailPage />,
          },
          {
            path: "/decks/:deckId/run",
            element: <DeckRunnerPage />,
          },
          {
            path: "/cards/:cardId/edit",
            element: <CardEditPage />,
          },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
      {
        element: <DesktopUploadLayout />,
        children: [{ path: "/upload", element: <UploadPage /> }],
      },
    ],
  },
]);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <PwaInstallPrompt />
    </>
  );
}

function AuthenticatedRoutes() {
  return (
    <PinGate>
      <Outlet />
    </PinGate>
  );
}
