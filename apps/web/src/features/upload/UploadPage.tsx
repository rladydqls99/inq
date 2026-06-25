import { useCallback, useState } from "react";

import type { ImportPreviewResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { DeckSelectOrCreate } from "./DeckSelectOrCreate";
import { ImportErrorList } from "./ImportErrorList";
import { ImportPreviewList } from "./ImportPreviewList";
import { ImportValidationSummary } from "./ImportValidationSummary";
import { MarkdownUploadPane } from "./MarkdownUploadPane";

export function UploadPage() {
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const selectDeck = useCallback((deckId: string) => {
    setSelectedDeckId(deckId);
  }, []);
  const canCreate =
    Boolean(selectedDeckId) &&
    preview !== null &&
    preview.errors.length === 0 &&
    preview.parsed > 0;

  async function validateMarkdown() {
    const response = await apiRequest<ImportPreviewResponse>(
      "/imports/markdown/preview",
      {
        method: "POST",
        body: JSON.stringify({ markdown }),
      },
    );
    setPreview(response);
  }

  return (
    <section className="upload-page">
      <PageHeader title="Upload" />
      <DeckSelectOrCreate
        selectedDeckId={selectedDeckId}
        onSelectDeck={selectDeck}
      />
      <div className="upload-grid">
        <MarkdownUploadPane markdown={markdown} onChangeMarkdown={setMarkdown} />
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
            <button type="button" disabled={!canCreate}>
              Create cards
            </button>
          </div>
          <ImportValidationSummary preview={preview} />
          <ImportErrorList errors={preview?.errors ?? []} />
          <ImportPreviewList cards={preview?.previewCards ?? []} />
        </section>
      </div>
    </section>
  );
}
