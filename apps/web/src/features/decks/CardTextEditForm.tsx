import type { ImportPreviewResponse, QuizSegment } from "@inq/shared";
import { toQuizText } from "@inq/shared";
import { useState } from "react";

import { useQuizTextPreview } from "@/entities/decks/api";
import { importErrorMessage } from "@/shared/lib/importErrorMessages";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { DeckQuizPreview } from "./DeckQuizPreview";

type CardTextEditFormProps = {
  category?: string | undefined;
  segments: QuizSegment[];
  isSaving: boolean;
  onDirty?: () => void;
  onSave: (markdown: string) => Promise<void> | void;
};

export function CardTextEditForm({
  category,
  segments,
  isSaving,
  onDirty,
  onSave,
}: CardTextEditFormProps) {
  const [markdown, setMarkdown] = useState(() =>
    toQuizText(segments, category),
  );
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [validationFailed, setValidationFailed] = useState(false);
  const previewMutation = useQuizTextPreview();
  const isSingleValidQuiz =
    preview !== null &&
    preview.errors.length === 0 &&
    preview.previewCards.length === 1;
  const containsMultipleQuizzes =
    preview !== null &&
    preview.errors.length === 0 &&
    preview.previewCards.length > 1;

  function updateMarkdown(nextMarkdown: string) {
    setMarkdown(nextMarkdown);
    setPreview(null);
    setValidationFailed(false);
    onDirty?.();
  }

  async function validateMarkdown() {
    setValidationFailed(false);

    try {
      setPreview(await previewMutation.mutateAsync(markdown));
    } catch {
      setPreview(null);
      setValidationFailed(true);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSingleValidQuiz) {
      return;
    }

    await onSave(markdown);
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-1.5">
        <label className="text-sm font-bold text-inq-ink" htmlFor="quiz-text">
          퀴즈 내용
        </label>
        <p
          className="m-0 text-sm leading-6 text-inq-ink-soft"
          id="quiz-format-hint"
        >
          정답으로 만들 단어를 대괄호로 감싸세요. 예: [훈민정음]을 만든 조선의
          왕은 [세종대왕]이다. 카테고리는 첫 줄에 **역사**처럼 적으세요.
        </p>
        <Textarea
          aria-describedby="quiz-format-hint"
          id="quiz-text"
          value={markdown}
          onChange={(event) => updateMarkdown(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-inq-line pt-4">
        <Button
          type="button"
          variant={isSingleValidQuiz ? "secondary" : "primary"}
          disabled={!markdown.trim() || previewMutation.isPending}
          onClick={() => void validateMarkdown()}
        >
          {previewMutation.isPending ? "검증 중..." : "검증하기"}
        </Button>
        <Button type="submit" disabled={!isSingleValidQuiz || isSaving}>
          {isSaving ? "저장 중..." : "퀴즈로 저장"}
        </Button>
      </div>

      <div aria-live="polite" className="grid gap-3">
        {validationFailed ? (
          <p className="m-0 text-sm font-bold text-inq-error">
            퀴즈를 검증하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}
        {containsMultipleQuizzes ? (
          <p className="m-0 text-sm font-bold text-inq-error">
            카드 수정에는 퀴즈 한 장만 입력할 수 있습니다. 구분선(---)을 제거해
            주세요.
          </p>
        ) : null}
        {preview?.errors.length ? (
          <ul
            className="m-0 grid list-none gap-2 p-0"
            aria-label="퀴즈 형식 오류"
          >
            {preview.errors.map((error) => (
              <li
                className="grid gap-1 rounded-lg bg-inq-surface p-3 text-sm text-inq-ink"
                key={`${error.blockIndex}-${error.line}-${error.column}-${error.code}`}
              >
                <strong className="text-inq-error">
                  {error.line ? `${error.line}행` : "입력 내용"}
                  {error.column ? ` ${error.column}열` : ""}
                </strong>
                <span>{importErrorMessage(error)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {isSingleValidQuiz ? (
          <section
            className="grid gap-3 rounded-lg border border-inq-line bg-inq-surface p-4"
            aria-label="검증된 퀴즈 미리보기"
          >
            <p className="m-0 text-sm font-bold text-inq-success">
              1장 검증 완료
            </p>
            <DeckQuizPreview
              category={preview.previewCards[0]?.category}
              segments={preview.previewCards[0]?.segments ?? []}
            />
          </section>
        ) : null}
      </div>
    </form>
  );
}
