"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/analytics";
import { chosenText, sentences } from "@/image/compose";
import { draw, type Fonts, fitsWell, LOOKS, measureWith } from "@/image/draw";
import { Sheet } from "./Sheet";

type Props = { reference: string; paperId: string; text: string; onClose: () => void };

// The faces of the site, by the names that the browser knows them.
function siteFonts(): Fonts {
  const style = getComputedStyle(document.documentElement);
  const name = (variable: string, rest: string) => [style.getPropertyValue(variable).trim(), rest].filter(Boolean).join(", ");
  return { text: name("--font-literata", "Georgia, serif"), ui: name("--font-inter", "system-ui, sans-serif") };
}

// An image of one paragraph to share: the reader chooses the sentences and a look.
// The preview is the image itself, so what the reader sees is what the reader shares.
export default function ImageSheet({ reference, paperId, text, onClose }: Props) {
  const all = useMemo(() => sentences(text), [text]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fonts, setFonts] = useState<Fonts | null>(null);
  const [look, setLook] = useState<(typeof LOOKS)[number]>(LOOKS[0]);
  const [chosen, setChosen] = useState<ReadonlySet<number>>(new Set());
  const [ok, setOk] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  // The faces must be ready before a canvas can measure with them. Then: as many sentences from the
  // start as fit the image.
  useEffect(() => {
    let current = true;
    const found = siteFonts();
    const ready = document.fonts?.load ? Promise.all([document.fonts.load(`400 48px ${found.text}`), document.fonts.load(`600 25px ${found.ui}`)]) : Promise.resolve([]);
    void ready
      .catch(() => [])
      .then(() => {
        if (!current) return;
        const context = document.createElement("canvas").getContext("2d");
        let count = all.length;
        if (context) {
          const measure = measureWith(context, found);
          while (count > 1 && !fitsWell(chosenText(all, new Set(Array.from({ length: count }, (_, i) => i))), measure)) count -= 1;
        }
        setChosen(new Set(Array.from({ length: count }, (_, i) => i)));
        setFonts(found);
        try {
          setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] }));
        } catch {
          // The browser has no share for a file. The reader saves the image.
        }
        track("image_opened", { paper_id: paperId });
      });
    return () => {
      current = false;
    };
  }, [all, paperId]);

  const words = chosenText(all, chosen);
  useEffect(() => {
    if (!fonts || !canvas.current) return;
    setOk(draw(canvas.current, fonts, look, reference, words));
  }, [fonts, look, reference, words]);

  const toggle = (i: number) =>
    setChosen((was) => {
      const next = new Set(was);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const file = () =>
    new Promise<File | null>((resolve) => {
      canvas.current?.toBlob((blob) => resolve(blob ? new File([blob], `urantia-papers-${reference.replace(/[:.]/g, "-")}.png`, { type: "image/png" }) : null), "image/png");
    });

  async function save() {
    const made = await file();
    if (!made) return setNote("The image did not save. Try again.");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(made);
    link.download = made.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    track("image_made", { paper_id: paperId, look: look.id, method: "save" });
    setNote("Image saved");
  }

  async function share() {
    const made = await file();
    if (!made) return setNote("The image did not share. Try again.");
    try {
      await navigator.share({ files: [made] });
      track("image_made", { paper_id: paperId, look: look.id, method: "share" });
    } catch (error) {
      // The reader closed the share sheet. That is a choice, not a fault.
      if ((error as { name?: string } | null)?.name !== "AbortError") setNote("The image did not share. Save it, then share it from your photos.");
    }
  }

  const ready = fonts !== null && ok && words !== "";
  const foot = (
    <>
      {canShare && (
        <button type="button" className="panel-button dark" disabled={!ready} onClick={() => void share()}>
          Share
        </button>
      )}
      <button type="button" className={`panel-button${canShare ? "" : " dark"}`} disabled={!ready} onClick={() => void save()}>
        Save the image
      </button>
      {note && (
        <span className="image-said" role="status">
          {note}
        </span>
      )}
    </>
  );
  return (
    <Sheet label={`Image of ${reference}`} onClose={onClose} className="image" foot={foot}>
      <h2>Image of {reference}</h2>
      <div className="image-preview">
        <canvas ref={canvas} role="img" aria-label={words ? `Image with the text: ${words}` : "Image with no text"} />
      </div>
      {fonts !== null && words === "" && <p className="image-note">Choose a sentence.</p>}
      {fonts !== null && words !== "" && !ok && (
        <p className="image-note" role="status">
          This is too much text for one image. Take a sentence off.
        </p>
      )}

      <div className="image-looks" role="group" aria-label="Look">
        {LOOKS.map((option) => (
          <button type="button" key={option.id} aria-pressed={look.id === option.id} aria-label={option.name} title={option.name} style={{ background: option.bg, color: option.ink }} onClick={() => setLook(option)}>
            Aa
          </button>
        ))}
      </div>

      {all.length > 1 && (
        <>
          <p className="image-help">Tap a sentence to put it on the image, or to take it off.</p>
          <p className="image-sentences">
            {all.map((sentence, i) => (
              <button type="button" key={i} aria-pressed={chosen.has(i)} onClick={() => toggle(i)}>
                {sentence}{" "}
              </button>
            ))}
          </p>
        </>
      )}

    </Sheet>
  );
}
