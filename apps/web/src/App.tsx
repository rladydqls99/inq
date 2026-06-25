import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import { PinGate } from "./components/PinGate";
import { PageHeader } from "./components/PageHeader";
import { ChallengeListPage } from "./features/challenges/ChallengeListPage";
import { HomePage } from "./features/challenges/HomePage";
import { CardEditPage } from "./features/decks/CardEditPage";
import { DeckDetailPage } from "./features/decks/DeckDetailPage";
import { DeckListPage } from "./features/decks/DeckListPage";
import { ChallengeRunnerPage } from "./features/runners/ChallengeRunnerPage";
import { DeckRunnerPage } from "./features/runners/DeckRunnerPage";
import { DesktopUploadLayout } from "./layouts/DesktopUploadLayout";
import { MobileAppShell } from "./layouts/MobileAppShell";

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
          { path: "/settings", element: <PlaceholderPage title="Settings" /> },
        ],
      },
      {
        element: <DesktopUploadLayout />,
        children: [{ path: "/upload", element: <PlaceholderPage title="Upload" /> }],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="page">
      <PageHeader title={title} />
    </section>
  );
}

function AuthenticatedRoutes() {
  return (
    <PinGate>
      <Outlet />
    </PinGate>
  );
}
