import type { ImportValidationError } from "@inq/shared";
import { importErrorMessage } from "./importErrorMessages";

type ImportErrorListProps = {
  errors: ImportValidationError[];
};

export function ImportErrorList({ errors }: ImportErrorListProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="import-error-list">
      {errors.map((error) => (
        <article
          key={`${error.blockIndex}-${error.line}-${error.column}-${error.code}`}
          className="import-error"
        >
          <div className="import-error__meta">
            <span>{error.code}</span>
            <span>
              {error.blockIndex + 1}번째 카드
              {error.line ? `, ${error.line}행` : ""}
              {error.column ? `, ${error.column}열` : ""}
            </span>
          </div>
          <p>{importErrorMessage(error)}</p>
          {error.snippet ? <code>{error.snippet}</code> : null}
        </article>
      ))}
    </div>
  );
}
