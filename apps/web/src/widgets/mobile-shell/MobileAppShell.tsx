import { Outlet } from "react-router-dom";

import { BottomTabNav } from "@/shared/ui/BottomTabNav";

export function MobileAppShell() {
  return (
    <div className="min-h-dvh bg-inq-canvas pb-[calc(var(--bottom-tab-height)+env(safe-area-inset-bottom,0px))] text-inq-ink">
      <main className="mx-auto min-h-[calc(100dvh-var(--bottom-tab-height)-env(safe-area-inset-bottom,0px))] w-full max-w-[720px] px-4 pt-[max(16px,env(safe-area-inset-top,0px))] pb-6 md:p-6">
        <Outlet />
      </main>
      <BottomTabNav />
    </div>
  );
}
