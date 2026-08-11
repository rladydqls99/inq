import type { ImportValidationError } from "@inq/shared";
import { Check } from "lucide-react";
import { importErrorMessage } from "./importErrorMessages";

type MarkdownUploadPaneProps = {
  markdown: string;
  errors: ImportValidationError[];
  canValidate: boolean;
  onChangeMarkdown: (markdown: string) => void;
  onValidate: () => Promise<void> | void;
};

export function MarkdownUploadPane({
  markdown,
  errors,
  canValidate,
  onChangeMarkdown,
  onValidate,
}: MarkdownUploadPaneProps) {
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    onChangeMarkdown(await readFileText(file));
  }

  return (
    <section
      className="grid min-h-0 gap-4 rounded-xl border border-inq-line bg-inq-canvas p-5"
      data-testid="upload-source-pane"
    >
      <header className="grid gap-1">
        <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">마크다운</h2>
        <p className="m-0 text-sm text-inq-ink-soft">
          파일을 선택하거나 내용을 직접 붙여 넣으세요.
        </p>
      </header>
      <label className="grid gap-1.5 text-sm font-bold">
        마크다운 파일
        <input
          className="min-h-12 cursor-pointer rounded-lg border border-inq-line bg-inq-canvas p-2 text-sm file:mr-3 file:min-h-8 file:cursor-pointer file:rounded file:border-0 file:bg-inq-surface file:px-3 file:font-bold file:text-inq-ink focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2"
          accept=".md,.markdown,text/markdown,text/plain"
          type="file"
          onChange={handleFileChange}
        />
      </label>
      <label className="grid min-h-0 flex-1 gap-1.5 text-sm font-bold">
        마크다운 내용
        <textarea
          className={`min-h-64 flex-1 resize-none rounded-lg border bg-inq-canvas p-3 font-mono text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-inq-highlight-strong/30 ${errors.length > 0 ? "border-inq-error" : "border-inq-line focus-visible:border-inq-highlight-strong"}`}
          value={markdown}
          onChange={(event) => onChangeMarkdown(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas disabled:cursor-not-allowed disabled:bg-inq-line disabled:text-inq-ink-soft"
          type="button"
          disabled={!canValidate}
          onClick={() => void onValidate()}
        >
          <Check aria-hidden="true" size={18} strokeWidth={2.25} />
          검증하기
        </button>
      </div>
      <MarkdownErrorLocations errors={errors} />
    </section>
  );
}

function MarkdownErrorLocations({
  errors,
}: {
  errors: ImportValidationError[];
}) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2" aria-label="마크다운 오류 위치">
      {errors.map((error) => (
        <div
          key={`${error.blockIndex}-${error.line}-${error.column}-${error.code}`}
          className="grid gap-1 rounded-lg bg-inq-surface p-3 text-sm text-inq-ink"
        >
          <strong>
            {error.line
              ? `${error.line}행`
              : `${error.blockIndex + 1}번째 카드`}
            {error.column ? ` ${error.column}열` : ""}
          </strong>
          <span>{importErrorMessage(error)}</span>
          {error.snippet ? (
            <code className="rounded bg-inq-canvas px-1 py-0.5 text-xs">
              {error.snippet}
            </code>
          ) : null}
        </div>
      ))}
    </div>
  );
}

async function readFileText(file: File) {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}
