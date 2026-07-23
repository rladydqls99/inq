import { useState } from "react";
import { useParams } from "react-router-dom";

import type { QuizSegment } from "@inq/shared";
import { useCard, useCardMutation } from "@/entities/decks/api";
import { ApiError } from "@/shared/api/client";
import { PageHeader } from "@/shared/ui/PageHeader";
import { CardSegmentEditForm } from "@/features/decks/CardSegmentEditForm";

export function CardEditPage() {
  const { cardId } = useParams();
  const {
    data: card,
    isPending: loading,
    isError: loadError,
  } = useCard(cardId);
  const saveMutation = useCardMutation();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveCard(segments: QuizSegment[]) {
    if (!card) {
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: card.id,
        segments,
        version: card.version,
      });
      setSaved(true);
      setSaveError(null);
    } catch (error) {
      setSaved(false);
      setSaveError(toSaveErrorMessage(error));
    }
  }

  function markDirty() {
    setSaved(false);
    setSaveError(null);
  }

  return (
    <section className="page">
      <PageHeader title="카드 수정" />
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {loadError ? (
        <div className="list-empty">카드를 불러오지 못했습니다.</div>
      ) : null}
      {!loading && !loadError && !card ? (
        <div className="list-empty">카드를 찾을 수 없습니다.</div>
      ) : null}
      {card ? (
        <div className="card-edit-page">
          <CardSegmentEditForm
            key={card.version}
            segments={card.segments}
            onDirty={markDirty}
            onSave={saveCard}
          />
          {saved ? <div className="save-message">저장되었습니다.</div> : null}
          {saveError ? <p className="card-editor__error">{saveError}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function toSaveErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "카드가 이미 변경되었습니다. 다시 열어 주세요.";
  }

  return "카드를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
