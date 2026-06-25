import type { ImportValidationError } from "@inq/shared";

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
              Block {error.blockIndex + 1}
              {error.line ? `, line ${error.line}` : ""}
              {error.column ? `, column ${error.column}` : ""}
            </span>
          </div>
          <p>{error.message}</p>
          {error.snippet ? <code>{error.snippet}</code> : null}
        </article>
      ))}
    </div>
  );
}
