import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

type QuizCategoryBadgeProps = {
  category?: string | undefined;
  className?: string;
};

export function QuizCategoryBadge({
  category,
  className,
}: QuizCategoryBadgeProps) {
  if (!category) {
    return null;
  }

  return (
    <Badge
      aria-label={`카테고리 ${category}`}
      className={cn(
        "h-5 rounded-full border-inq-line bg-inq-surface px-1.5 py-0 text-xs font-bold leading-none text-inq-ink",
        className,
      )}
      variant="outline"
    >
      {category}
    </Badge>
  );
}
