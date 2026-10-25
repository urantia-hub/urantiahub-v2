// One run of the notices: who is due, claim each notice in the account, send, and report.
// Each outside thing comes in as a dependency, so a test sends nothing.

import { paperById, paperPath, referenceHref } from "@/content/paper-index";
import { type Device, type Due, dueNotices, passageFor, type Reader } from "@/notices/due";
import { releaseDate } from "@/content/releases";
import type { Lang } from "@/i18n/lang";
import { pageHref } from "@/i18n/paths";
import { messages } from "@/i18n/messages";
import { dailyMail, type Mail, opening, type ReleasePictures, releaseMail, reminderMail } from "./mail";

export type Claim = { userId: string; kind: Due["kind"]; key: string; channel: Due["channel"] };
export type Push = { for: string; title: string; body: string; path: string };
export type Passage = { ref: string; text: string; paperId: string; paperTitle: string };
// `offPost`: the address that a mail program calls for "unsubscribe", with one press and no page.
export type OutMail = Mail & { to: string; offUrl: string; offPost: string };

export type News = { date: string; title: string; changes: string[]; mail?: ReleasePictures; es?: { title: string; changes: string[] } };

export type JobDeps = {
  now: Date;
  origin: string;
  // Null: each reader. A list: only these readers, for the first days.
  only: string[] | null;
  // The release that readers hear of now. Absent or null: none.
  news?: News | null;
  readers(): Promise<Reader[]>;
  // Answers the claims that are new. Only those are sent.
  claim(claims: Claim[]): Promise<Claim[]>;
  release(claims: Claim[]): Promise<void>;
  devices(report: { gone: string[]; ok: string[] }): Promise<void>;
  passage(ref: string, lang: Lang): Promise<Passage>;
  // One answer for each mail, in order: true when the mail service took it.
  sendMails(mails: OutMail[]): Promise<boolean[]>;
  sendPush(device: Device, push: Push): Promise<"ok" | "gone" | "failed">;
  readerKey(userId: string): Promise<string>;
  // An email kind: the streak has no email.
  // `lang`: the language of the reader, so the link opens the page in that language.
  offUrl(userId: string, kind: MailKind, lang?: Lang): string;
  offPost(userId: string, kind: MailKind): string;
};

export type MailKind = Exclude<Due["kind"], "streak">;

export type Report = { readers: number; due: number; claimed: number; mails: number; pushes: number; failed: number; gone: number };

const CLAIM_BATCH = 500;
const PUSH_TEXT = 140;
const same = (a: Claim, b: Claim) => a.userId === b.userId && a.kind === b.kind && a.key === b.key && a.channel === b.channel;
const short = (text: string) => (text.length > PUSH_TEXT ? `${text.slice(0, PUSH_TEXT - 1).trimEnd()}…` : text);

export async function runNotices(deps: JobDeps): Promise<Report> {
  const all = await deps.readers();
  const readers = deps.only ? all.filter((reader) => deps.only?.includes(reader.userId)) : all;
  // A Spanish reader hears of a release only when it has Spanish words.
  const due = readers.flatMap((reader) => dueNotices(reader, deps.now, deps.news ?? null)).filter((notice) => notice.kind !== "releases" || notice.lang === "en" || deps.news?.es);
  const report: Report = { readers: readers.length, due: due.length, claimed: 0, mails: 0, pushes: 0, failed: 0, gone: 0 };
  if (due.length === 0) return report;

  const claimed: Claim[] = [];
  for (let i = 0; i < due.length; i += CLAIM_BATCH) {
    claimed.push(...(await deps.claim(due.slice(i, i + CLAIM_BATCH).map(({ userId, kind, key, channel }) => ({ userId, kind, key, channel })))));
  }
  const mine = due.filter((notice) => claimed.some((claim) => same(claim, notice)));
  report.claimed = mine.length;

  // What a notice says. A passage is read one time for each date and language. Null: it cannot be made now.
  const passages = new Map<string, Promise<Passage | null>>();
  const passageOf = (date: string, lang: Lang) => {
    const ref = passageFor(date);
    const key = `${ref} ${lang}`;
    if (!passages.has(key)) passages.set(key, deps.passage(ref, lang).catch(() => null));
    return passages.get(key) as Promise<Passage | null>;
  };
  const settingsUrl = (lang: Lang) => `${deps.origin}${pageHref(lang, "/notifications")}`;
  // A streak notice is a push only, so it has no mail.
  async function content(notice: Due): Promise<{ mail: Mail | null; push: Omit<Push, "for"> } | null> {
    // A push only: the text is made with the rules of the streak, in `dueNotices`.
    if (notice.kind === "streak") {
      if (!notice.streak) return null;
      const { title, body, path } = notice.streak;
      return { mail: null, push: { title, body, path } };
    }
    const { lang } = notice;
    const t = messages(lang).mail;
    // The off page and the settings page are English until they have Spanish twins.
    const links = { offUrl: deps.offUrl(notice.userId, notice.kind, notice.lang), settingsUrl: settingsUrl(notice.lang) };
    if (notice.kind === "daily") {
      const passage = await passageOf(notice.key, lang);
      if (!passage || !paperById(passage.paperId, lang)) return null;
      const path = `${paperPath(passage.paperId, lang)}#${passage.ref}`;
      return {
        mail: dailyMail({ ...passage, url: `${deps.origin}${path}` }, links, lang),
        push: { title: t.dailyPush, body: `${short(passage.text)} (${passage.ref})`, path },
      };
    }
    if (notice.kind === "releases") {
      const news = deps.news;
      const words = lang === "es" ? news?.es : news;
      if (!news || !words || words.changes.length === 0) return null;
      return {
        mail: releaseMail({ title: words.title, changes: words.changes, date: releaseDate(news.date, lang), url: `${deps.origin}/releases`, origin: deps.origin, mail: news.mail }, links, lang),
        push: { title: t.releaseSubject(words.title), body: short(words.changes[0]), path: "/releases" },
      };
    }
    const paper = notice.place ? paperById(notice.place.paperId, lang) : undefined;
    if (notice.kind !== "reminder" || !notice.place || !paper) return null;
    const path = referenceHref(notice.place, lang);
    const name = paper.id === "0" ? paper.title : t.paperName(paper.id, paper.title);
    // The first words of the section, so the reader sees where the text goes on. Without them the
    // reminder still goes out, with the name of the paper.
    const first = await deps.passage(`${paper.id}:${notice.place.sectionId}.1`, lang).catch(() => null);
    const words = first ? opening(first.text) : null;
    return {
      mail: reminderMail({ paperId: paper.id, paperTitle: paper.title, url: `${deps.origin}${path}`, opening: words }, links, lang),
      push: { title: t.placePush(name), body: words ? `${opening(first?.text ?? "", 110)} …` : t.placeKept, path },
    };
  }

  const failed: Claim[] = [];
  const fail = (notice: Due) => failed.push({ userId: notice.userId, kind: notice.kind, key: notice.key, channel: notice.channel });
  const mails: { notice: Due; mail: OutMail }[] = [];
  const gone: string[] = [];
  const ok: string[] = [];

  for (const notice of mine) {
    const made = await content(notice);
    if (!made) {
      fail(notice);
      continue;
    }
    if (notice.channel === "email") {
      if (notice.email && made.mail && notice.kind !== "streak") mails.push({ notice, mail: { ...made.mail, to: notice.email, offUrl: deps.offUrl(notice.userId, notice.kind, notice.lang), offPost: deps.offPost(notice.userId, notice.kind) } });
      continue;
    }
    // Each push names its reader. The worker of the device shows it only for that reader.
    const push = { ...made.push, for: await deps.readerKey(notice.userId) };
    const results = await Promise.all(notice.devices.map((device) => deps.sendPush(device, push).catch(() => "failed" as const)));
    results.forEach((result, i) => (result === "gone" ? gone : result === "ok" ? ok : []).push(notice.devices[i].endpoint));
    if (results.includes("ok")) report.pushes += 1;
    // No device took it, and at least one can still take it: the next run tries again.
    else if (results.includes("failed")) fail(notice);
  }

  if (mails.length > 0) {
    const sent = await deps.sendMails(mails.map((m) => m.mail)).catch(() => mails.map(() => false));
    mails.forEach((m, i) => (sent[i] === true ? (report.mails += 1) : fail(m.notice)));
  }

  report.failed = failed.length;
  report.gone = gone.length;
  // A failure of these two must not hide what was sent. A claim that stays means "sent", which is
  // the safe side: a reader never gets one notice two times.
  if (failed.length > 0) await deps.release(failed).catch(() => undefined);
  if (gone.length > 0 || ok.length > 0) await deps.devices({ gone, ok }).catch(() => undefined);
  return report;
}

// One of each email, to one address, now. For a look at the real emails in a real mail program
// before any reader gets one. It claims nothing, so it changes nothing for a reader.
// `lang`: the language of the emails. A Spanish sample has a release only when the release has Spanish words.
export async function runSamples(deps: Pick<JobDeps, "now" | "origin" | "passage" | "sendMails" | "offUrl" | "offPost">, to: string, userId: string, longRef: string, sample: News | null = null, lang: Lang = "en"): Promise<{ mails: number; sent: number }> {
  const settingsUrl = `${deps.origin}${pageHref(lang, "/notifications")}`;
  const links = (kind: MailKind) => ({ offUrl: deps.offUrl(userId, kind, lang), settingsUrl });
  const out = (mail: Mail, kind: MailKind): OutMail => ({ ...mail, to, offUrl: deps.offUrl(userId, kind, lang), offPost: deps.offPost(userId, kind) });
  const mails: OutMail[] = [];
  // The passage of today, and the longest passage of the list, so a long text can be judged.
  for (const ref of [passageFor(deps.now.toISOString().slice(0, 10)), longRef]) {
    const passage = await deps.passage(ref, lang);
    mails.push(out(dailyMail({ ...passage, url: `${deps.origin}${paperPath(passage.paperId, lang)}#${passage.ref}` }, links("daily"), lang), "daily"));
  }
  const paper = paperById("2", lang);
  if (paper) {
    const first = await deps.passage("2:1.1", lang).catch(() => null);
    mails.push(out(reminderMail({ paperId: paper.id, paperTitle: paper.title, url: `${deps.origin}${referenceHref({ paperId: "2", sectionId: "1" }, lang)}`, opening: first ? opening(first.text) : null }, links("reminder"), lang), "reminder"));
  }
  const words = lang === "es" ? sample?.es : sample;
  if (sample && words) mails.push(out(releaseMail({ title: words.title, changes: words.changes, date: releaseDate(sample.date, lang), url: `${deps.origin}/releases`, origin: deps.origin, mail: sample.mail }, links("releases"), lang), "releases"));
  const sent = await deps.sendMails(mails);
  return { mails: mails.length, sent: sent.filter(Boolean).length };
}
