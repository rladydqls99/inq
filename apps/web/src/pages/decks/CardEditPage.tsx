import { useState } from "react";
import { useParams } from "react-router-dom";

import { useCard, useCardMutation } from "@/entities/decks/api";
import { ApiError } from "@/shared/api/client";
import { PageHeader } from "@/shared/ui/PageHeader";
import { CardTextEditForm } from "@/features/decks/CardTextEditForm";

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

  async function saveCard(markdown: string) {
    if (!card) {
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: card.id,
        markdown,
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
    <section className="grid gap-4">
      <PageHeader title="카드 수정" />
      {loading ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          불러오는 중입니다.
        </div>
      ) : null}
      {loadError ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          카드를 불러오지 못했습니다.
        </div>
      ) : null}
      {!loading && !loadError && !card ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          카드를 찾을 수 없습니다.
        </div>
      ) : null}
      {card ? (
        <div className="grid gap-3">
          <CardTextEditForm
            key={card.version}
            category={card.category}
            segments={card.segments}
            isSaving={saveMutation.isPending}
            onDirty={markDirty}
            onSave={saveCard}
          />
          {saved ? (
            <div className="text-sm font-bold text-inq-success">
              저장되었습니다.
            </div>
          ) : null}
          {saveError ? (
            <p className="m-0 text-sm font-bold text-inq-error">{saveError}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function toSaveErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "카드가 이미 변경되었습니다. 다시 열어 주세요.";
  }

  if (error instanceof ApiError && error.status === 400) {
    return "입력한 퀴즈 형식이 올바르지 않습니다. 다시 검증해 주세요.";
  }

  return "카드를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
