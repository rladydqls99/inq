import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { CardResponse, QuizSegment } from "@inq/shared";
import { ApiError, apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { CardSegmentEditForm } from "./CardSegmentEditForm";

export function CardEditPage() {
  const { cardId } = useParams();
  const [card, setCard] = useState<CardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      return;
    }

    let mounted = true;

    apiRequest<CardResponse>(`/cards/${cardId}`)
      .then((response) => {
        if (mounted) {
          setCard(response);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [cardId]);

  async function saveCard(segments: QuizSegment[]) {
    if (!card) {
      return;
    }

    try {
      const updatedCard = await apiRequest<CardResponse>(`/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          segments,
          version: card.version,
        }),
      });

      setCard(updatedCard);
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
      {loadError ? <div className="list-empty">카드를 불러오지 못했습니다.</div> : null}
      {!loading && !loadError && !card ? <div className="list-empty">카드를 찾을 수 없습니다.</div> : null}
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
