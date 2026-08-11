import type { ImportPreviewResponse } from "@inq/shared";

type ImportValidationSummaryProps = {
  preview: ImportPreviewResponse | null;
};

export function ImportValidationSummary({
  preview,
}: ImportValidationSummaryProps) {
  if (!preview) {
    return (
      <div className="text-sm font-bold text-inq-ink-soft">
        마크다운을 입력하고 검증해 주세요.
      </div>
    );
  }

  if (preview.errors.length > 0) {
    return (
      <div className="rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-error">
        오류 {preview.errors.length}개
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-success">
      {preview.parsed}장 검증 완료
    </div>
  );
}
