import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { CardResponse, QuizSegment } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { CardSegmentEditForm } from "./CardSegmentEditForm";

export function CardEditPage() {
  const { cardId } = useParams();
  const [card, setCard] = useState<CardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!cardId) {
      return;
    }

    let mounted = true;

    apiRequest<CardResponse>(`/cards/${cardId}`)
      .then((response) => {
        if (mounted) {
          setCard(response);
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

    const updatedCard = await apiRequest<CardResponse>(`/cards/${card.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        segments,
        version: card.version,
      }),
    });

    setCard(updatedCard);
    setSaved(true);
  }

  return (
    <section className="page">
      <PageHeader title="Edit Card" />
      {loading ? <div className="list-empty">Loading</div> : null}
      {!loading && !card ? <div className="list-empty">Card not found</div> : null}
      {card ? (
        <div className="card-edit-page">
          <CardSegmentEditForm key={card.version} segments={card.segments} onSave={saveCard} />
          {saved ? <div className="save-message">Saved</div> : null}
        </div>
      ) : null}
    </section>
  );
}
