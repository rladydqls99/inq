import { useCallback, useState } from "react";

import type { ImportPreviewResponse } from "@inq/shared";
import {
  useConfirmMarkdownImport,
  useMarkdownPreview,
} from "@/entities/upload/api";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DeckSelectOrCreate } from "./DeckSelectOrCreate";
import { ImportConfirmBar } from "./ImportConfirmBar";
import { ImportErrorList } from "./ImportErrorList";
import { ImportPreviewList } from "./ImportPreviewList";
import { ImportValidationSummary } from "./ImportValidationSummary";
import { MarkdownUploadPane } from "./MarkdownUploadPane";

export function UploadPage() {
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const previewMutation = useMarkdownPreview();
  const importMutation = useConfirmMarkdownImport();
  const selectDeck = useCallback((deckId: string) => {
    setSelectedDeckId(deckId);
  }, []);
  const updateMarkdown = useCallback((nextMarkdown: string) => {
    setMarkdown(nextMarkdown);
    setPreview(null);
    setCreatedMessage(null);
    setCreateError(false);
    setValidationError(false);
  }, []);
  const canCreate =
    Boolean(selectedDeckId) &&
    preview !== null &&
    preview.errors.length === 0 &&
    preview.parsed > 0;

  async function validateMarkdown() {
    setCreatedMessage(null);
    setCreateError(false);
    setValidationError(false);

    try {
      const response = await previewMutation.mutateAsync(markdown);
      setPreview(response);
    } catch {
      setPreview(null);
      setValidationError(true);
    }
  }

  async function confirmImport() {
    setCreateError(false);

    try {
      const response = await importMutation.mutateAsync({
        deckId: selectedDeckId,
        markdown,
      });

      setMarkdown("");
      setPreview(null);
      setCreatedMessage(`${response.createdCount}장의 카드를 만들었습니다.`);
    } catch {
      setCreatedMessage(null);
      setCreateError(true);
    }
  }

  return (
    <section className="upload-page">
      <PageHeader title="업로드" />
      <DeckSelectOrCreate
        selectedDeckId={selectedDeckId}
        onSelectDeck={selectDeck}
      />
      <div className="upload-grid">
        <MarkdownUploadPane
          markdown={markdown}
          errors={preview?.errors ?? []}
          canValidate={Boolean(markdown.trim())}
          onChangeMarkdown={updateMarkdown}
          onValidate={validateMarkdown}
        />
        <section
          className="upload-pane upload-pane--preview"
          data-testid="upload-preview-pane"
        >
          <header className="upload-pane__header">
            <h2>검증 결과와 미리보기</h2>
            <p>검증된 카드를 확인한 뒤 선택한 덱에 추가하세요.</p>
          </header>
          <div className="upload-preview-content">
            {createError ? (
              <div className="import-summary is-error">
                카드를 생성하지 못했습니다.
              </div>
            ) : null}
            {validationError ? (
              <div className="import-summary is-error">
                마크다운을 검증하지 못했습니다.
              </div>
            ) : null}
            <ImportValidationSummary preview={preview} />
            <ImportErrorList errors={preview?.errors ?? []} />
            <ImportPreviewList cards={preview?.previewCards ?? []} />
          </div>
          <div className="upload-confirm-slot">
            <ImportConfirmBar
              canCreate={canCreate}
              createdMessage={createdMessage}
              onConfirm={confirmImport}
            />
          </div>
        </section>
      </div>
    </section>
  );
}
