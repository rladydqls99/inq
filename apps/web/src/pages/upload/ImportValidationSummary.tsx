import type { ImportPreviewResponse } from "@inq/shared";

type ImportValidationSummaryProps = {
  preview: ImportPreviewResponse | null;
};

export function ImportValidationSummary({
  preview,
}: ImportValidationSummaryProps) {
  if (!preview) {
    return <div className="list-empty">마크다운을 입력하고 검증해 주세요.</div>;
  }

  if (preview.errors.length > 0) {
    return (
      <div className="import-summary is-error">
        오류 {preview.errors.length}개
      </div>
    );
  }

  return <div className="import-summary">{preview.parsed}장 검증 완료</div>;
}
