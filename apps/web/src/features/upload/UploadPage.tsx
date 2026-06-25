import { useCallback, useState } from "react";

import { PageHeader } from "../../components/PageHeader";
import { DeckSelectOrCreate } from "./DeckSelectOrCreate";
import { MarkdownUploadPane } from "./MarkdownUploadPane";

export function UploadPage() {
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const selectDeck = useCallback((deckId: string) => {
    setSelectedDeckId(deckId);
  }, []);

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
          <div className="list-empty">Add markdown to preview cards.</div>
        </section>
      </div>
    </section>
  );
}
