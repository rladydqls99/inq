import { useState } from "react";

import { useBackupExport } from "@/entities/settings/api";

export function BackupExportButton() {
  const [exported, setExported] = useState(false);
  const [error, setError] = useState(false);
  const backupExport = useBackupExport();

  async function exportBackup() {
    try {
      const backup = await backupExport.mutateAsync();
      const serialized = JSON.stringify(backup, null, 2);
      const blob = new Blob([serialized], { type: "application/json" });
      const objectUrl = URL.createObjectURL?.(blob);

      if (objectUrl) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = `inq-backup-${backup.exportedAt.slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      }

      setExported(true);
      setError(false);
    } catch {
      setExported(false);
      setError(true);
    }
  }

  return (
    <div className="settings-action">
      <button type="button" onClick={() => void exportBackup()}>
        백업 내보내기
      </button>
      {exported ? <span>백업 파일이 준비되었습니다.</span> : null}
      {error ? <span>백업을 내보내지 못했습니다.</span> : null}
    </div>
  );
}
