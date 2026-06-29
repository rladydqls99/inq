import { useState } from "react";

import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { PinChangeForm } from "../auth/PinChangeForm";
import { BackupExportButton } from "./BackupExportButton";

export function SettingsPage() {
  const [lockError, setLockError] = useState(false);

  async function lock() {
    try {
      await apiRequest("/auth/lock", { method: "POST" });
      setLockError(false);
      window.dispatchEvent(new Event("inq:locked"));
    } catch {
      setLockError(true);
    }
  }

  return (
    <section className="page">
      <PageHeader title="Settings" />
      <div className="settings-sections">
        <section className="settings-section">
          <h2>PIN</h2>
          <PinChangeForm />
        </section>
        <section className="settings-section">
          <h2>Backup</h2>
          <BackupExportButton />
        </section>
        <section className="settings-section">
          <h2>Lock</h2>
          <div className="settings-action">
            <button type="button" onClick={() => void lock()}>
              Lock
            </button>
            {lockError ? <span>잠금 처리에 실패했습니다.</span> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
