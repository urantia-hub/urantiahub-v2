import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose center">
      <h1>Page not found</h1>
      <p>This address has no page.</p>
      <p>
        <Link className="btn" href="/papers">
          All papers
        </Link>
      </p>
    </div>
  );
}
