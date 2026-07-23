import { Outlet } from "react-router-dom";

import { BottomTabNav } from "@/shared/ui/BottomTabNav";

export function MobileAppShell() {
  return (
    <div className="mobile-app-shell">
      <main className="mobile-app-shell__content">
        <Outlet />
      </main>
      <BottomTabNav />
    </div>
  );
}
