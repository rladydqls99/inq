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
      className="upload-pane upload-pane--source"
      data-testid="upload-source-pane"
    >
      <header className="upload-pane__header">
        <h2>마크다운</h2>
        <p>파일을 선택하거나 내용을 직접 붙여 넣으세요.</p>
      </header>
      <label className="upload-file-field">
        마크다운 파일
        <input
          accept=".md,.markdown,text/markdown,text/plain"
          type="file"
          onChange={handleFileChange}
        />
      </label>
      <label className="upload-editor-field">
        마크다운 내용
        <textarea
          className={errors.length > 0 ? "has-markdown-errors" : undefined}
          value={markdown}
          onChange={(event) => onChangeMarkdown(event.target.value)}
        />
      </label>
      <div className="upload-actions">
        <button
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
    <div className="markdown-error-locations" aria-label="마크다운 오류 위치">
      {errors.map((error) => (
        <div
          key={`${error.blockIndex}-${error.line}-${error.column}-${error.code}`}
          className="markdown-error-location"
        >
          <strong>
            {error.line
              ? `${error.line}행`
              : `${error.blockIndex + 1}번째 카드`}
            {error.column ? ` ${error.column}열` : ""}
          </strong>
          <span>{importErrorMessage(error)}</span>
          {error.snippet ? <code>{error.snippet}</code> : null}
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
