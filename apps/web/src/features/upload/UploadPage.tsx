import { useCallback, useState } from "react";

import type { ImportPreviewResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
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
  const selectDeck = useCallback((deckId: string) => {
    setSelectedDeckId(deckId);
  }, []);
  const updateMarkdown = useCallback((nextMarkdown: string) => {
    setMarkdown(nextMarkdown);
    setPreview(null);
    setCreatedMessage(null);
    setCreateError(false);
  }, []);
  const canCreate =
    Boolean(selectedDeckId) &&
    preview !== null &&
    preview.errors.length === 0 &&
    preview.parsed > 0;

  async function validateMarkdown() {
    setCreatedMessage(null);
    setCreateError(false);
    const response = await apiRequest<ImportPreviewResponse>(
      "/import/markdown/preview",
      {
        method: "POST",
        body: JSON.stringify({ markdown }),
      },
    );
    setPreview(response);
  }

  async function confirmImport() {
    setCreateError(false);

    try {
      const response = await apiRequest<{ createdCount: number }>(
        "/import/markdown/confirm",
        {
          method: "POST",
          body: JSON.stringify({ deckId: selectedDeckId, markdown }),
        },
      );

      setMarkdown("");
      setPreview(null);
      setCreatedMessage(`${response.createdCount} cards created`);
    } catch {
      setCreatedMessage(null);
      setCreateError(true);
    }
  }

  return (
    <section className="upload-page">
      <PageHeader title="Upload" />
      <DeckSelectOrCreate
        selectedDeckId={selectedDeckId}
        onSelectDeck={selectDeck}
      />
      <div className="upload-grid">
        <MarkdownUploadPane markdown={markdown} onChangeMarkdown={updateMarkdown} />
        <section className="upload-pane" data-testid="upload-preview-pane">
          <h2>Validation and preview</h2>
          <div className="upload-actions">
            <button
              type="button"
              disabled={!markdown.trim()}
              onClick={() => void validateMarkdown()}
            >
              Validate
            </button>
          </div>
          <ImportConfirmBar
            canCreate={canCreate}
            createdMessage={createdMessage}
            onConfirm={confirmImport}
          />
          {createError ? <div className="import-summary is-error">카드를 생성하지 못했습니다.</div> : null}
          <ImportValidationSummary preview={preview} />
          <ImportErrorList errors={preview?.errors ?? []} />
          <ImportPreviewList cards={preview?.previewCards ?? []} />
        </section>
      </div>
    </section>
  );
}
