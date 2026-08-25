import type { ImportPreviewCard } from "@inq/shared";
import { DeckQuizPreview } from "@/features/decks/DeckQuizPreview";

type ImportPreviewListProps = {
  cards: ImportPreviewCard[];
};

export function ImportPreviewList({ cards }: ImportPreviewListProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      className="grid max-h-[28rem] gap-2 overflow-auto rounded-lg border border-inq-line p-3 focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2"
      aria-label="퀴즈 카드 미리보기"
      tabIndex={0}
    >
      {cards.map((card) => (
        <article
          key={card.blockIndex}
          className="grid gap-2 border-b border-inq-line pb-3 last:border-b-0 last:pb-0"
        >
          <span className="text-xs font-bold text-inq-ink-soft">
            {card.blockIndex + 1}번째 카드
          </span>
          <DeckQuizPreview category={card.category} segments={card.segments} />
        </article>
      ))}
    </div>
  );
}
