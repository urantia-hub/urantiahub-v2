// One run of the notices: who is due, claim each notice in the account, send, and report.
// Each outside thing comes in as a dependency, so a test sends nothing.

import { paperById, paperPath, referenceHref } from "@/content/paper-index";
import { type Device, type Due, dueNotices, passageFor, type Reader } from "@/notices/due";
import { releaseDate } from "@/content/releases";
import { dailyMail, type Mail, opening, releaseMail, reminderMail } from "./mail";

export type Claim = { userId: string; kind: Due["kind"]; key: string; channel: Due["channel"] };
export type Push = { for: string; title: string; body: string; path: string };
export type Passage = { ref: string; text: string; paperId: string; paperTitle: string };
// `offPost`: the address that a mail program calls for "unsubscribe", with one press and no page.
export type OutMail = Mail & { to: string; offUrl: string; offPost: string };

export type News = { date: string; title: string; changes: string[] };

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
  passage(ref: string): Promise<Passage>;
  // One answer for each mail, in order: true when the mail service took it.
  sendMails(mails: OutMail[]): Promise<boolean[]>;
  sendPush(device: Device, push: Push): Promise<"ok" | "gone" | "failed">;
  readerKey(userId: string): Promise<string>;
  // An email kind: the streak has no email.
  offUrl(userId: string, kind: MailKind): string;
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
  const due = readers.flatMap((reader) => dueNotices(reader, deps.now, deps.news ?? null));
  const report: Report = { readers: readers.length, due: due.length, claimed: 0, mails: 0, pushes: 0, failed: 0, gone: 0 };
  if (due.length === 0) return report;

  const claimed: Claim[] = [];
  for (let i = 0; i < due.length; i += CLAIM_BATCH) {
    claimed.push(...(await deps.claim(due.slice(i, i + CLAIM_BATCH).map(({ userId, kind, key, channel }) => ({ userId, kind, key, channel })))));
  }
  const mine = due.filter((notice) => claimed.some((claim) => same(claim, notice)));
  report.claimed = mine.length;

  // What a notice says. A passage is read one time for each date. Null: it cannot be made now.
  const passages = new Map<string, Promise<Passage | null>>();
  const passageOf = (date: string) => {
    const ref = passageFor(date);
    if (!passages.has(ref)) passages.set(ref, deps.passage(ref).catch(() => null));
    return passages.get(ref) as Promise<Passage | null>;
  };
  const settingsUrl = `${deps.origin}/notifications`;
  // A streak notice is a push only, so it has no mail.
  async function content(notice: Due): Promise<{ mail: Mail | null; push: Omit<Push, "for"> } | null> {
    // A push only: the text is made with the rules of the streak, in `dueNotices`.
    if (notice.kind === "streak") {
      if (!notice.streak) return null;
      const { title, body, path } = notice.streak;
      return { mail: null, push: { title, body, path } };
    }
    const links = { offUrl: deps.offUrl(notice.userId, notice.kind), settingsUrl };
    if (notice.kind === "daily") {
      const passage = await passageOf(notice.key);
      if (!passage || !paperById(passage.paperId)) return null;
      const path = `${paperPath(passage.paperId)}#${passage.ref}`;
      return {
        mail: dailyMail({ ...passage, url: `${deps.origin}${path}` }, links),
        push: { title: "Your passage for today", body: `${short(passage.text)} (${passage.ref})`, path },
      };
    }
    if (notice.kind === "releases") {
      const news = deps.news;
      if (!news || news.changes.length === 0) return null;
      const title = `New in UrantiaHub: ${news.title}`;
      return {
        mail: releaseMail({ title: news.title, changes: news.changes, date: releaseDate(news.date), url: `${deps.origin}/releases` }, links),
        push: { title, body: short(news.changes[0]), path: "/releases" },
      };
    }
    const paper = notice.place ? paperById(notice.place.paperId) : undefined;
    if (notice.kind !== "reminder" || !notice.place || !paper) return null;
    const path = referenceHref(notice.place);
    const name = paper.id === "0" ? paper.title : `Paper ${paper.id}, ${paper.title}`;
    // The first words of the section, so the reader sees where the text goes on. Without them the
    // reminder still goes out, with the name of the paper.
    const first = await deps.passage(`${paper.id}:${notice.place.sectionId}.1`).catch(() => null);
    const words = first ? opening(first.text) : null;
    return {
      mail: reminderMail({ paperId: paper.id, paperTitle: paper.title, url: `${deps.origin}${path}`, opening: words }, links),
      push: { title: `Your place in ${name}`, body: words ? `${opening(first?.text ?? "", 110)} …` : "Your place is kept.", path },
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
      if (notice.email && made.mail && notice.kind !== "streak") mails.push({ notice, mail: { ...made.mail, to: notice.email, offUrl: deps.offUrl(notice.userId, notice.kind), offPost: deps.offPost(notice.userId, notice.kind) } });
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
export async function runSamples(deps: Pick<JobDeps, "now" | "origin" | "passage" | "sendMails" | "offUrl" | "offPost">, to: string, userId: string, longRef: string, sample: News | null = null): Promise<{ mails: number; sent: number }> {
  const settingsUrl = `${deps.origin}/notifications`;
  const links = (kind: MailKind) => ({ offUrl: deps.offUrl(userId, kind), settingsUrl });
  const out = (mail: Mail, kind: MailKind): OutMail => ({ ...mail, to, offUrl: deps.offUrl(userId, kind), offPost: deps.offPost(userId, kind) });
  const mails: OutMail[] = [];
  // The passage of today, and the longest passage of the list, so a long text can be judged.
  for (const ref of [passageFor(deps.now.toISOString().slice(0, 10)), longRef]) {
    const passage = await deps.passage(ref);
    mails.push(out(dailyMail({ ...passage, url: `${deps.origin}${paperPath(passage.paperId)}#${passage.ref}` }, links("daily")), "daily"));
  }
  const paper = paperById("2");
  if (paper) {
    const first = await deps.passage("2:1.1").catch(() => null);
    mails.push(out(reminderMail({ paperId: paper.id, paperTitle: paper.title, url: `${deps.origin}${referenceHref({ paperId: "2", sectionId: "1" })}`, opening: first ? opening(first.text) : null }, links("reminder")), "reminder"));
  }
  if (sample) mails.push(out(releaseMail({ title: sample.title, changes: sample.changes, date: releaseDate(sample.date), url: `${deps.origin}/releases` }, links("releases")), "releases"));
  const sent = await deps.sendMails(mails);
  return { mails: mails.length, sent: sent.filter(Boolean).length };
}
