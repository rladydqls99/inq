import { useEffect, useState } from "react";

import type { DeckResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";

type ChallengeFormProps = {
  onCreated: () => Promise<void> | void;
  presetDeckId?: string;
};

export function ChallengeForm({ onCreated, presetDeckId }: ChallengeFormProps) {
  const [name, setName] = useState("");
  const [deckId, setDeckId] = useState(presetDeckId ?? "");
  const [intervalOne, setIntervalOne] = useState("3");
  const [intervalTwo, setIntervalTwo] = useState("5");
  const [intervalThree, setIntervalThree] = useState("10");
  const [decks, setDecks] = useState<DeckResponse[]>([]);
  const [deckLoadError, setDeckLoadError] = useState(false);
  const [error, setError] = useState(false);
  const parsedIntervals = parseIntervals([intervalOne, intervalTwo, intervalThree]);
  const trimmedName = name.trim();

  useEffect(() => {
    let mounted = true;

    apiRequest<DeckResponse[]>("/decks")
      .then((response) => {
        if (mounted) {
          setDecks(response);
          setDeckId(presetDeckId ?? response[0]?.id ?? "");
          setDeckLoadError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setDeckLoadError(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [presetDeckId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedName || !parsedIntervals) {
      return;
    }

    setError(false);

    try {
      await apiRequest("/challenges", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          deckId,
          reviewIntervalsDays: parsedIntervals,
        }),
      });

      setName("");
      await onCreated();
    } catch {
      setError(true);
    }
  }

  return (
    <form className="challenge-form" onSubmit={submit}>
      <label>
        챌린지 이름
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(false);
          }}
        />
      </label>
      <label>
        덱
        <select
          value={deckId}
          disabled={Boolean(presetDeckId)}
          onChange={(event) => {
            setDeckId(event.target.value);
            setError(false);
          }}
        >
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </select>
      </label>
      <div className="interval-grid" aria-label="챌린지 주기">
        <label>
          첫 번째 주기(일)
          <input
            inputMode="numeric"
            value={intervalOne}
            onChange={(event) => {
              setIntervalOne(event.target.value);
              setError(false);
            }}
          />
        </label>
        <label>
          두 번째 주기(일)
          <input
            inputMode="numeric"
            value={intervalTwo}
            onChange={(event) => {
              setIntervalTwo(event.target.value);
              setError(false);
            }}
          />
        </label>
        <label>
          세 번째 주기(일)
          <input
            inputMode="numeric"
            value={intervalThree}
            onChange={(event) => {
              setIntervalThree(event.target.value);
              setError(false);
            }}
          />
        </label>
      </div>
      <button type="submit" disabled={!trimmedName || !deckId || !parsedIntervals}>
        등록하기
      </button>
      {deckLoadError ? <span>덱 목록을 불러오지 못했습니다.</span> : null}
      {error ? <span>챌린지를 생성하지 못했습니다.</span> : null}
    </form>
  );
}

function parseIntervals(values: string[]): number[] | null {
  const parts = values.map((part) => part.trim());

  if (parts.some((part) => part.length === 0)) {
    return null;
  }

  const intervals = parts.map(Number);
  return intervals.every((interval) => Number.isInteger(interval) && interval > 0)
    ? intervals
    : null;
}
