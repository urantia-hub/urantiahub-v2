// The links of the Resources page. Each address must answer, and each line says what the place is,
// with no claim about the text. `ours`: UrantiaHub's maker runs the place.

export type Resource = { name: string; about: string; url: string };
export type ResourceGroup = { title: string; ours?: true; resources: Resource[] };

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    title: "By the makers of UrantiaHub",
    ours: true,
    resources: [
      { name: "The Papers in an AI assistant", about: "Add the Urantia Papers to Claude, ChatGPT, Grok, or Gemini.", url: "https://docs.urantia.dev/assistants" },
      { name: "UrantiaHub on YouTube", about: "A video of each paper: the narration, with the text on the screen.", url: "https://www.youtube.com/@urantia-hub" },
      { name: "urantia.dev", about: "The open API of the Urantia Papers, for developers and AI tools. No key and no account.", url: "https://urantia.dev" },
      { name: "Dalamatia", about: "An interactive telling of Paper 66 and the city of Dalamatia, with links back to the text.", url: "https://dalamatia.urantiahub.com" },
    ],
  },
  {
    title: "Organizations",
    resources: [
      { name: "Urantia Foundation", about: "The publisher of The Urantia Book since 1955.", url: "https://www.urantia.org/" },
      { name: "The Urantia Book Fellowship", about: "A readers’ organization that has fostered study since 1955.", url: "https://www.urantiabook.org/" },
      { name: "Urantia Association International", about: "A global network of reader associations, with events and conferences.", url: "https://urantia-association.org/" },
      { name: "The Center for Unity", about: "A home for projects about the Urantia Papers.", url: "https://thecenterforunity.com/" },
    ],
  },
  {
    title: "Study",
    resources: [
      { name: "Urantiapedia", about: "An online encyclopedia of the Urantia Papers.", url: "https://urantiapedia.org/" },
      { name: "Urantia University Institute", about: "Structured courses on the Urantia Papers.", url: "https://urantiauniversity.org/" },
      { name: "TruthBook", about: "A library of articles and study materials.", url: "https://www.truthbook.com/" },
      { name: "Urantia Book Tutor", about: "Guided study and educational resources.", url: "https://urantiabooktutor.com/" },
      { name: "Urantia Book Trivia", about: "Trivia and educational content about the Papers.", url: "https://urantiabooktrivia.com/" },
      { name: "Discover Jesus", about: "The life and teachings of Jesus as the Urantia Papers present them.", url: "https://discoverjesus.com/" },
      { name: "The Divine Within", about: "A site about the divine presence within, as the Papers describe it.", url: "https://the-divine-within.com/" },
    ],
  },
  {
    title: "Listen and watch",
    resources: [
      { name: "Urantia Book Pod", about: "A podcast that discusses the concepts of the Papers.", url: "https://urantiabookpod.com/" },
      { name: "Urantia Book Network", about: "A non-profit collective of creative, educational, and technological resources, on YouTube.", url: "https://www.youtube.com/@urantiabooknetwork" },
      { name: "Gary Tonge (Vision Afar)", about: "Visual presentations and animations of concepts from the Papers, on YouTube.", url: "https://www.youtube.com/@GaryTonge" },
      { name: "Divine Mother Productions", about: "Media inspired by the concepts of the Papers.", url: "https://divinemotherproductions.com/" },
    ],
  },
  {
    title: "Communities",
    resources: [
      { name: "r/urantia", about: "A discussion forum on Reddit.", url: "https://www.reddit.com/r/urantia/" },
      { name: "Urantia", about: "A Facebook group for readers.", url: "https://www.facebook.com/groups/urantiagroup" },
      { name: "Urantia Book: Science & History", about: "A Facebook group for the science and history in the Papers.", url: "https://www.facebook.com/groups/418407648220368" },
    ],
  },
];
