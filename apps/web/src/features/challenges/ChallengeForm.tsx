import { useEffect, useState } from "react";

import type { DeckResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";

type ChallengeFormProps = {
  onCreated: () => Promise<void> | void;
};

export function ChallengeForm({ onCreated }: ChallengeFormProps) {
  const [name, setName] = useState("");
  const [deckId, setDeckId] = useState("");
  const [intervals, setIntervals] = useState("3,5,10");
  const [decks, setDecks] = useState<DeckResponse[]>([]);
  const parsedIntervals = parseIntervals(intervals);
  const trimmedName = name.trim();

  useEffect(() => {
    let mounted = true;

    apiRequest<DeckResponse[]>("/decks").then((response) => {
      if (mounted) {
        setDecks(response);
        setDeckId(response[0]?.id ?? "");
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedName || !parsedIntervals) {
      return;
    }

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
  }

  return (
    <form className="challenge-form" onSubmit={submit}>
      <label>
        Challenge name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Deck
        <select
          value={deckId}
          onChange={(event) => setDeckId(event.target.value)}
        >
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Intervals
        <input
          value={intervals}
          onChange={(event) => setIntervals(event.target.value)}
        />
      </label>
      <button type="submit" disabled={!trimmedName || !deckId || !parsedIntervals}>
        Create
      </button>
    </form>
  );
}

function parseIntervals(value: string): number[] | null {
  const parts = value.split(",").map((part) => part.trim());

  if (parts.some((part) => part.length === 0)) {
    return null;
  }

  const intervals = parts.map(Number);
  return intervals.every((interval) => Number.isInteger(interval) && interval > 0)
    ? intervals
    : null;
}
