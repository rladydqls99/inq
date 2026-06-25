import type { ImportPreviewResponse } from "@inq/shared";

type ImportValidationSummaryProps = {
  preview: ImportPreviewResponse | null;
};

export function ImportValidationSummary({ preview }: ImportValidationSummaryProps) {
  if (!preview) {
    return <div className="list-empty">Add markdown to preview cards.</div>;
  }

  if (preview.errors.length > 0) {
    return (
      <div className="import-summary is-error">
        {preview.errors.length} errors
      </div>
    );
  }

  return <div className="import-summary">{preview.parsed} parsed</div>;
}
