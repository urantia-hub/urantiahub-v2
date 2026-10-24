"use client";

import { useState } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
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
  lang?: Lang;
};

const GUIDE = "https://docs.urantia.dev/assistants";

// The reader chooses a question and an assistant. The assistant opens in a new tab with the question in
// it, and the reader sends it there. The Hub calls no model.
export default function AskSheet({ about, label, paperId, questions, build, onClose, lang = "en" }: Props) {
  const t = messages(lang);
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
      setNote(then ? t.askCopiedPaste(assistant.name) : t.askCopied);
      count(then ? "open" : "copy");
    } catch {
      setNote(t.askCopyFailed);
    }
  }

  const foot = (
    <>
      <div className="share-acts">
        {canPrefill(who, text) ? (
          <a className="panel-button dark" href={assistantHref(who, text)} target="_blank" rel="noopener" onClick={() => count("open")}>
            <Icon name="external" />
            {t.askOpenIn(assistant.name)}
          </a>
        ) : (
          <button type="button" className="panel-button dark" onClick={() => void copy(() => window.open(assistant.home, "_blank", "noopener"))}>
            <Icon name="external" />
            {t.askCopyOpen(assistant.name)}
          </button>
        )}
      </div>
      <button type="button" className="share-third" onClick={() => void copy()}>
        {t.askCopy}
      </button>
    </>
  );

  return (
    <Sheet label={t.askTitle} onClose={onClose} className="share ask" close closeLabel={t.close} foot={foot}>
      <h2>{t.askTitle}</h2>
      <p className="ask-sub">{label} {t.askSub}</p>
      <p className="share-label">{t.askQuestion}</p>
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
        <input className="ask-own" type="text" aria-label={t.askOwn} placeholder={t.askOwnPlaceholder} maxLength={300} value={own} onChange={(event) => setOwn(event.target.value)} />
      </div>
      <p className="share-label">{t.askWho}</p>
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
        {seen ? t.askHide : t.askSee}
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
        {t.askFine} {about === "paragraph" ? t.askFineParagraph : t.askFinePaper} {t.askFineMore}{" "}
        <a href={GUIDE} target="_blank" rel="noopener">
          {t.askConnect}
        </a>
      </p>
    </Sheet>
  );
}
