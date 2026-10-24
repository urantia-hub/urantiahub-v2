import { Icon } from "@/components/icons";
import { RESOURCE_GROUPS } from "@/content/resources";
import { pageMetadata } from "@/seo/metadata";

export const metadata = pageMetadata({
  title: "Resources",
  description: "Places to study the Urantia Papers and to meet other readers: tools, organizations, study aids, audio and video, and communities.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <div className="prose listing">
      <h1>Resources</h1>
      <p className="lead">Places to study the Urantia Papers and to meet other readers. UrantiaHub runs only the first group.</p>
      {RESOURCE_GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={`group-${group.title}`}>
          <h2 className="label" id={`group-${group.title}`}>
            {group.title}
          </h2>
          {group.resources.map((resource) => (
            <a className="res" key={resource.url} href={resource.url} target="_blank" rel="noopener">
              <span>
                <b>{resource.name}</b>
                <small>{resource.about}</small>
                <span className="sr-only"> (opens in a new tab)</span>
              </span>
              <Icon name="external" />
            </a>
          ))}
        </section>
      ))}
    </div>
  );
}
