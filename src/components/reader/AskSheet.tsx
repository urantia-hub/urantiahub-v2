"use client";

import { useState } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { ASSISTANTS, type AssistantId, assistantHref, canPrefill, rememberAssistant, rememberedAssistant } from "@/reader/assistant";
import { Sheet } from "./Sheet";

type Props = {
  about: "paragraph" | "paper";
  // What the question is about, in words: "About paragraph 1:1.3."
  label: string;
  paperId: string;
  questions: readonly string[];
  // The whole text for the assistant, from the question of the reader.
  build: (question: string) => string;
  onClose: () => void;
};

const GUIDE = "https://docs.urantia.dev/assistants";

// The reader chooses a question and an assistant. The assistant opens in a new tab with the question in
// it, and the reader sends it there. The Hub calls no model.
export default function AskSheet({ about, label, paperId, questions, build, onClose }: Props) {
  const [picked, setPicked] = useState(0);
  const [own, setOwn] = useState("");
  const [who, setWho] = useState<AssistantId>(rememberedAssistant);
  const [seen, setSeen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const assistant = ASSISTANTS.find((one) => one.id === who) ?? ASSISTANTS[0];
  const mine = own.trim();
  const text = build(mine || questions[picked]);
  const count = (method: "open" | "copy") => track("assistant_asked", { paper_id: paperId, about, assistant: who, question: mine ? "own" : picked + 1, method });

  async function copy(then?: () => void) {
    try {
      // The copy starts in the press, before a new tab takes the focus.
      const done = navigator.clipboard.writeText(text);
      then?.();
      await done;
      setNote(then ? `The question is copied. Paste it in ${assistant.name}.` : "The question is copied.");
      count(then ? "open" : "copy");
    } catch {
      setNote("The question did not copy. Press “See what the assistant gets”, then select the text and copy it.");
    }
  }

  const foot = (
    <>
      <div className="share-acts">
        {canPrefill(who, text) ? (
          <a className="panel-button dark" href={assistantHref(who, text)} target="_blank" rel="noopener" onClick={() => count("open")}>
            <Icon name="external" />
            Open in {assistant.name}
          </a>
        ) : (
          <button type="button" className="panel-button dark" onClick={() => void copy(() => window.open(assistant.home, "_blank", "noopener"))}>
            <Icon name="external" />
            Copy, then open {assistant.name}
          </button>
        )}
      </div>
      <button type="button" className="share-third" onClick={() => void copy()}>
        Copy the question
      </button>
    </>
  );

  return (
    <Sheet label="Ask an assistant" onClose={onClose} className="share ask" close foot={foot}>
      <h2>Ask an assistant</h2>
      <p className="ask-sub">{label} Your question opens in your assistant, ready to send.</p>
      <p className="share-label">The question</p>
      <div className="ask-qs">
        {questions.map((question, i) => (
          <button
            type="button"
            className="ask-q"
            key={question}
            aria-pressed={!mine && i === picked}
            onClick={() => {
              setPicked(i);
              setOwn("");
            }}
          >
            <i aria-hidden="true" />
            {question}
          </button>
        ))}
        <input className="ask-own" type="text" aria-label="Your own question" placeholder="Or write your own question" maxLength={300} value={own} onChange={(event) => setOwn(event.target.value)} />
      </div>
      <p className="share-label">Your assistant</p>
      <div className="ask-who">
        {ASSISTANTS.map((one) => (
          <button
            type="button"
            key={one.id}
            aria-pressed={one.id === who}
            onClick={() => {
              setWho(one.id);
              rememberAssistant(one.id);
              setNote(null);
            }}
          >
            {one.name}
          </button>
        ))}
      </div>
      <button type="button" className="ask-see" aria-expanded={seen} onClick={() => setSeen((was) => !was)}>
        {seen ? "Hide what the assistant gets" : "See what the assistant gets"}
      </button>
      {seen && (
        <pre className="ask-sent" data-testid="ask-sent">
          {text}
        </pre>
      )}
      {note && (
        <p className="share-note" role="status">
          {note}
        </p>
      )}
      <p className="ask-fine">
        The answer comes from the assistant, not from UrantiaHub. {about === "paragraph" ? "The question carries this paragraph and the nearest one before it." : "The question names the paper and where to read it."} An assistant with the Urantia Papers connector can read more.{" "}
        <a href={GUIDE} target="_blank" rel="noopener">
          How to connect it
        </a>
      </p>
    </Sheet>
  );
}
