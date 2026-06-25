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

    await apiRequest("/challenges", {
      method: "POST",
      body: JSON.stringify({
        name,
        deckId,
        reviewIntervalsDays: parseIntervals(intervals),
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
      <button type="submit" disabled={!name || !deckId}>
        Create
      </button>
    </form>
  );
}

function parseIntervals(value: string): number[] {
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part) && part > 0);
}
