import { useMutation } from "@tanstack/react-query";
import type { BackupExport } from "@inq/shared";

import { apiRequest } from "@/shared/api/client";

export const useBackupExport = () =>
  useMutation({ mutationFn: () => apiRequest<BackupExport>("/backup/export") });
