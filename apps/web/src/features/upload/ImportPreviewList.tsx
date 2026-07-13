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
    <div className="import-preview-list" aria-label="퀴즈 카드 미리보기" tabIndex={0}>
      {cards.map((card) => (
        <article key={card.blockIndex} className="import-preview-card">
          <span>{card.blockIndex + 1}번째 카드</span>
          <QuizPreview segments={card.segments} />
        </article>
      ))}
    </div>
  );
}
