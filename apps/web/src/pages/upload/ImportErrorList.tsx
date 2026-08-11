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
    <div className="grid gap-2">
      {errors.map((error) => (
        <article
          key={`${error.blockIndex}-${error.line}-${error.column}-${error.code}`}
          className="grid gap-2 rounded-lg bg-inq-surface p-3 text-sm text-inq-ink"
        >
          <div className="flex flex-wrap gap-x-2 text-xs font-bold text-inq-error [&_span+span]:before:mr-2 [&_span+span]:before:content-['·']">
            <span>{error.code}</span>
            <span>
              {error.blockIndex + 1}번째 카드
              {error.line ? `, ${error.line}행` : ""}
              {error.column ? `, ${error.column}열` : ""}
            </span>
          </div>
          <p className="m-0">{importErrorMessage(error)}</p>
          {error.snippet ? (
            <code className="rounded bg-inq-canvas px-1 py-0.5 text-xs">
              {error.snippet}
            </code>
          ) : null}
        </article>
      ))}
    </div>
  );
}
