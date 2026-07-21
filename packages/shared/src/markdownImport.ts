import type {
  ImportPreviewCard,
  ImportPreviewResponse,
  ImportValidationError,
  ImportValidationErrorCode,
  QuizSegment,
} from "./types";

type MarkdownBlock = {
  blockIndex: number;
  startLine: number;
  text: string;
};

type Location = {
  line: number;
  column: number;
  snippet: string;
};

export function parseMarkdownImport(markdown: string): ImportPreviewResponse {
  const errors: ImportValidationError[] = [];
  const previewCards: ImportPreviewCard[] = [];
  const blocks = splitMarkdownBlocks(markdown);

  if (blocks.length === 0) {
    return {
      parsed: 0,
      errors: [
        {
          blockIndex: 0,
          line: null,
          column: null,
          code: "empty_import",
          message: "Markdown import must contain at least one quiz block.",
          snippet: "",
        },
      ],
      previewCards: [],
    };
  }

  for (const block of blocks) {
    const parsedBlock = parseBlock(block);

    if (parsedBlock.errors.length > 0) {
      errors.push(...parsedBlock.errors);
      continue;
    }

    if (!parsedBlock.hasAnswer) {
      errors.push(
        createError(
          block,
          "missing_answer",
          "Quiz card must contain at least one answer segment.",
          {
            line: block.startLine,
            column: null,
            snippet: firstNonEmptyLine(block.text) ?? "",
          },
        ),
      );
      continue;
    }

    previewCards.push({
      blockIndex: block.blockIndex,
      segments: normalizeTextSegments(parsedBlock.segments),
    });
  }

  return {
    parsed: previewCards.length,
    errors,
    previewCards,
  };
}

function splitMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const currentLines: string[] = [];
  let blockIndex = 0;
  let blockStartLine = 1;

  const lines = markdown.split(/\r?\n/);

  for (const [lineIndex, line] of lines.entries()) {
    if (line.trim() === "---") {
      addBlockIfNotEmpty(blocks, blockIndex, blockStartLine, currentLines);
      blockIndex += 1;
      currentLines.length = 0;
      blockStartLine = lineIndex + 2;
      continue;
    }

    currentLines.push(line);
  }

  addBlockIfNotEmpty(blocks, blockIndex, blockStartLine, currentLines);

  return blocks;
}

function addBlockIfNotEmpty(
  blocks: MarkdownBlock[],
  blockIndex: number,
  startLine: number,
  lines: string[],
) {
  const text = lines.join("\n");

  if (text.trim().length === 0) {
    return;
  }

  blocks.push({ blockIndex, startLine, text });
}

function parseBlock(block: MarkdownBlock): {
  segments: QuizSegment[];
  errors: ImportValidationError[];
  hasAnswer: boolean;
} {
  const segments: QuizSegment[] = [];
  const errors: ImportValidationError[] = [];
  let textBuffer = "";
  let answerBuffer = "";
  let openBracketIndex: number | null = null;
  let answerCount = 0;

  for (let index = 0; index < block.text.length; index += 1) {
    const character = block.text[index];

    if (character === "[") {
      if (openBracketIndex !== null) {
        errors.push(
          createError(
            block,
            "nested_bracket",
            "Nested answer brackets are not supported.",
            locationForIndex(block, index),
          ),
        );
        return { segments: [], errors, hasAnswer: false };
      }

      if (textBuffer.length > 0) {
        segments.push({ type: "text", value: textBuffer });
        textBuffer = "";
      }

      openBracketIndex = index;
      answerBuffer = "";
      continue;
    }

    if (character === "]") {
      if (openBracketIndex === null) {
        errors.push(
          createError(
            block,
            "unmatched_close_bracket",
            "Closing bracket has no matching opening bracket.",
            locationForIndex(block, index),
          ),
        );
        return { segments: [], errors, hasAnswer: false };
      }

      if (answerBuffer.trim().length === 0) {
        errors.push(
          createError(
            block,
            "empty_answer",
            "Answer text cannot be empty.",
            locationForIndex(block, openBracketIndex),
          ),
        );
        return { segments: [], errors, hasAnswer: false };
      }

      answerCount += 1;
      segments.push({
        type: "answer",
        id: `answer-${answerCount}`,
        value: answerBuffer.trim(),
      });
      openBracketIndex = null;
      answerBuffer = "";
      continue;
    }

    if (openBracketIndex === null) {
      textBuffer += character;
    } else {
      answerBuffer += character;
    }
  }

  if (openBracketIndex !== null) {
    errors.push(
      createError(
        block,
        "unmatched_open_bracket",
        "Opening bracket has no matching closing bracket.",
        locationForIndex(block, openBracketIndex),
      ),
    );
    return { segments: [], errors, hasAnswer: false };
  }

  if (textBuffer.length > 0) {
    segments.push({ type: "text", value: textBuffer });
  }

  return { segments, errors, hasAnswer: answerCount > 0 };
}

function createError(
  block: MarkdownBlock,
  code: ImportValidationErrorCode,
  message: string,
  location: Location | { line: number; column: null; snippet: string },
): ImportValidationError {
  return {
    blockIndex: block.blockIndex,
    line: location.line,
    column: location.column,
    code,
    message,
    snippet: location.snippet,
  };
}

function locationForIndex(block: MarkdownBlock, index: number): Location {
  const before = block.text.slice(0, index);
  const lineOffset = before.split("\n").length - 1;
  const lineStartIndex = before.lastIndexOf("\n") + 1;
  const column = index - lineStartIndex + 1;
  const line = block.startLine + lineOffset;
  const snippet = block.text.split("\n")[lineOffset] ?? "";

  return { line, column, snippet };
}

function firstNonEmptyLine(text: string): string | null {
  return text.split("\n").find((line) => line.trim().length > 0) ?? null;
}

function normalizeTextSegments(segments: QuizSegment[]): QuizSegment[] {
  const normalized = segments.map((segment) =>
    segment.type === "text"
      ? { ...segment, value: segment.value.replace(/\s+/g, " ") }
      : segment,
  );
  const textIndexes = normalized.reduce<number[]>((indexes, segment, index) => {
    if (segment.type === "text") {
      indexes.push(index);
    }
    return indexes;
  }, []);

  const firstTextIndex = textIndexes[0];
  const lastTextIndex = textIndexes.at(-1);

  if (firstTextIndex !== undefined && normalized[firstTextIndex]?.type === "text") {
    normalized[firstTextIndex].value = normalized[firstTextIndex].value.trimStart();
  }

  if (lastTextIndex !== undefined && normalized[lastTextIndex]?.type === "text") {
    normalized[lastTextIndex].value = normalized[lastTextIndex].value.trimEnd();
  }

  return normalized;
}
