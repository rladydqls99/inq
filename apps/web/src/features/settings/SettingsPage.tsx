import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { PinChangeForm } from "../auth/PinChangeForm";
import { BackupExportButton } from "./BackupExportButton";

export function SettingsPage() {
  async function lock() {
    await apiRequest("/auth/lock", { method: "POST" });
    window.dispatchEvent(new Event("inq:locked"));
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
          </div>
        </section>
      </div>
    </section>
  );
}
