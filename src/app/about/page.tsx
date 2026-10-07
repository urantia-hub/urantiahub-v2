import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="prose">
      <h1>About</h1>

      <h2>The Urantia Papers</h2>
      <p>
        The Urantia Papers are 196 papers and a foreword, in four parts. They were first published in 1955 as The
        Urantia Book.
      </p>
      <p>
        The subjects are God and the universe, the history of this world, and the life and teachings of Jesus. The
        four parts are The Central and Superuniverses, The Local Universe, The History of Urantia, and The Life and
        Teachings of Jesus.
      </p>
      <p>
        Readers cite the Papers by paper, section, and paragraph. The reference 99:1.1 is Paper 99, section 1,
        paragraph 1.
      </p>

      <h2>UrantiaHub</h2>
      <p>
        UrantiaHub is a place to read the Papers. The full text is here, free to read, with no account.{" "}
        <Link href="/papers">See all papers.</Link>
      </p>
      <p>UrantiaHub is an independent project. It is not affiliated with Urantia Foundation.</p>

      <h2>The text</h2>
      <p>
        The English text of the Papers is in the public domain in the United States (Michael Foundation v. Urantia
        Foundation, 10th Cir. 2003).
      </p>
      <p>
        The text on this site comes from <a href="https://urantia.dev">urantia.dev</a>, an open API for the Papers.
      </p>
    </div>
  );
}
