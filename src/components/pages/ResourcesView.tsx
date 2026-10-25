import { Icon } from "@/components/icons";
import { RESOURCE_GROUPS } from "@/content/resources";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { pageMetadata } from "@/seo/metadata";

export function resourcesMetadata(lang: Lang) {
  const t = messages(lang).resourcesPage;
  return pageMetadata({ title: t.metaTitle, description: t.metaDescription, path: lang === "es" ? "/es/recursos" : "/resources", lang, twin: lang === "es" ? "/resources" : "/es/recursos" });
}

// Places to study the Papers, in the language of the page. A proper name stays as it is.
export function ResourcesView({ lang }: { lang: Lang }) {
  const t = messages(lang);
  return (
    <div className="prose listing">
      <h1>{t.resourcesPage.title}</h1>
      <p className="lead">{t.resourcesPage.lead}</p>
      {RESOURCE_GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={`group-${group.title}`}>
          <h2 className="label" id={`group-${group.title}`}>
            {lang === "es" ? group.es : group.title}
          </h2>
          {group.resources.map((resource) => (
            <a className="res" key={resource.url} href={resource.url} target="_blank" rel="noopener">
              <span>
                <b>{(lang === "es" && resource.es.name) || resource.name}</b>
                <small>{lang === "es" ? resource.es.about : resource.about}</small>
                <span className="sr-only"> {t.parNewTab}</span>
              </span>
              <Icon name="external" />
            </a>
          ))}
        </section>
      ))}
    </div>
  );
}
