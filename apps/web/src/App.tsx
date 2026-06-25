import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import { PinGate } from "./components/PinGate";
import { PageHeader } from "./components/PageHeader";
import { ChallengeListPage } from "./features/challenges/ChallengeListPage";
import { HomePage } from "./features/challenges/HomePage";
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
            element: <PlaceholderPage title="Challenge Run" />,
          },
          { path: "/decks", element: <PlaceholderPage title="Decks" /> },
          {
            path: "/decks/:deckId/manage",
            element: <PlaceholderPage title="Deck Cards" />,
          },
          {
            path: "/decks/:deckId/run",
            element: <PlaceholderPage title="Deck Run" />,
          },
          {
            path: "/cards/:cardId/edit",
            element: <PlaceholderPage title="Edit Card" />,
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
