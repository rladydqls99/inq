import { Outlet } from "react-router-dom";

export function DesktopUploadLayout() {
  return (
    <main className="h-dvh min-h-0 overflow-hidden bg-inq-surface p-6 max-[1023px]:h-auto max-[1023px]:min-h-dvh max-[1023px]:overflow-auto max-[1023px]:p-4">
      <Outlet />
    </main>
  );
}
