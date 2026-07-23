import type { ImportValidationError } from "@inq/shared";

const messages: Record<ImportValidationError["code"], string> = {
  empty_import: "가져올 마크다운을 입력해 주세요.",
  missing_answer: "정답 구간이 없습니다. 정답은 대괄호로 감싸 주세요.",
  unmatched_open_bracket: "여는 대괄호에 맞는 닫는 대괄호가 없습니다.",
  unmatched_close_bracket: "닫는 대괄호에 맞는 여는 대괄호가 없습니다.",
  empty_answer: "정답 구간이 비어 있습니다.",
  nested_bracket: "정답 구간 안에 다른 대괄호를 넣을 수 없습니다.",
};

export function importErrorMessage(error: ImportValidationError) {
  return messages[error.code] ?? error.message;
}
