import type { ImportPreviewCard } from "@inq/shared";
import { QuizPreview } from "../../components/QuizPreview";

type ImportPreviewListProps = {
  cards: ImportPreviewCard[];
};

export function ImportPreviewList({ cards }: ImportPreviewListProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="import-preview-list">
      {cards.map((card) => (
        <article key={card.blockIndex} className="import-preview-card">
          <span>Block {card.blockIndex + 1}</span>
          <QuizPreview segments={card.segments} />
        </article>
      ))}
    </div>
  );
}
