import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getRevealedText,
  parseMarkdownImport,
  type CardResponse,
  type QuizSegment,
} from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";

type EditableCard = CardResponse & {
  draft: string;
  error: string | null;
  saved: boolean;
};

export function DeckDetailPage() {
  const { deckId } = useParams();
  const [cards, setCards] = useState<EditableCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deckId) {
      return;
    }

    let mounted = true;

    apiRequest<CardResponse[]>(`/decks/${deckId}/cards`)
      .then((response) => {
        if (mounted) {
          setCards(response.map(toEditableCard));
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
  }, [deckId]);

  function updateDraft(cardId: string, draft: string) {
    setCards((current) =>
      current.map((card) =>
        card.id === cardId ? { ...card, draft, error: null, saved: false } : card,
      ),
    );
  }

  async function saveCard(card: EditableCard) {
    const parsed = parseMarkdownImport(card.draft);
    const nextCard = parsed.previewCards[0];

    if (parsed.errors.length > 0 || !nextCard) {
      setCardState(card.id, {
        error: parsed.errors[0]?.message ?? "Quiz card must contain at least one answer segment.",
        saved: false,
      });
      return;
    }

    const updatedCard = await apiRequest<CardResponse>(`/cards/${card.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        segments: nextCard.segments,
        version: card.version,
      }),
    });

    setCards((current) =>
      current.map((currentCard) =>
        currentCard.id === card.id
          ? { ...toEditableCard(updatedCard), saved: true }
          : currentCard,
      ),
    );
  }

  function setCardState(
    cardId: string,
    patch: Pick<EditableCard, "error" | "saved">,
  ) {
    setCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, ...patch } : card)),
    );
  }

  return (
    <section className="page">
      <PageHeader title="Deck Cards" />
      {loading ? <div className="list-empty">Loading</div> : null}
      {!loading && cards.length === 0 ? <div className="list-empty">No cards</div> : null}
      <div className="card-editor-list">
        {cards.map((card) => (
          <article key={card.id} className="card-editor">
            <p className="card-editor__revealed">{getRevealedText(card.segments)}</p>
            <label>
              Quiz markdown
              <textarea
                value={card.draft}
                onChange={(event) => updateDraft(card.id, event.target.value)}
              />
            </label>
            <div className="card-editor__actions">
              <button type="button" onClick={() => void saveCard(card)}>
                Save card
              </button>
              {card.saved ? <span>Saved</span> : null}
            </div>
            {card.error ? <p className="card-editor__error">{card.error}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function toEditableCard(card: CardResponse): EditableCard {
  return {
    ...card,
    draft: segmentsToMarkdown(card.segments),
    error: null,
    saved: false,
  };
}

function segmentsToMarkdown(segments: QuizSegment[]) {
  return segments
    .map((segment) =>
      segment.type === "answer" ? `[${segment.value}]` : segment.value,
    )
    .join("");
}
