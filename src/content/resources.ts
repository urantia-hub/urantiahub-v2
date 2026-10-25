// The links of the Resources page. Each address must answer, and each line says what the place is,
// with no claim about the text. `ours`: UrantiaHub's maker runs the place. `es`: the Spanish of the line
// and of the group title; a name is a proper name and stays as it is.

export type Resource = { name: string; about: string; url: string; es: { about: string } };
export type ResourceGroup = { title: string; es: string; ours?: true; resources: Resource[] };

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    title: "By the maker of UrantiaHub",
    es: "Del creador de UrantiaHub",
    ours: true,
    resources: [
      { name: "The Papers in an AI assistant", about: "Add the Urantia Papers to Claude, ChatGPT, Grok, or Gemini.", es: { about: "Agrega los Documentos de Urantia a Claude, ChatGPT, Grok o Gemini." }, url: "https://docs.urantia.dev/assistants" },
      { name: "UrantiaHub on YouTube", about: "A video of each paper: the narration, with the text on the screen.", es: { about: "Un video de cada documento: la narración en inglés, con el texto en la pantalla." }, url: "https://www.youtube.com/@urantiahub" },
      { name: "The Urantia Papers on Spotify", about: "The narration of each paper, as a podcast.", es: { about: "La narración de cada documento en inglés, como pódcast." }, url: "https://open.spotify.com/show/7IDP6RsZbKtUjfEwLLHtuw" },
      { name: "urantia.dev", about: "The open API of the Urantia Papers, for developers and AI tools. No key and no account.", es: { about: "La API abierta de los Documentos de Urantia, para desarrolladores y herramientas de IA. Sin clave y sin cuenta." }, url: "https://urantia.dev" },
      { name: "Dalamatia", about: "An interactive telling of Paper 66 and the city of Dalamatia, with links back to the text.", es: { about: "Un relato interactivo del Documento 66 y de la ciudad de Dalamatia, con enlaces al texto. En inglés." }, url: "https://dalamatia.urantiahub.com" },
    ],
  },
  {
    title: "Organizations",
    es: "Organizaciones",
    resources: [
      { name: "Urantia Foundation", about: "The publisher of The Urantia Book since 1955.", es: { about: "La editorial de El libro de Urantia desde 1955." }, url: "https://www.urantia.org/" },
      { name: "The Urantia Book Fellowship", about: "A readers’ organization that has fostered study since 1955.", es: { about: "Una organización de lectores que fomenta el estudio desde 1955." }, url: "https://www.urantiabook.org/" },
      { name: "Urantia Association International", about: "A global network of reader associations, with events and conferences.", es: { about: "Una red mundial de asociaciones de lectores, con eventos y conferencias." }, url: "https://urantia-association.org/" },
      { name: "The Center for Unity", about: "A home for projects about the Urantia Papers.", es: { about: "Un lugar para proyectos sobre los Documentos de Urantia." }, url: "https://thecenterforunity.com/" },
    ],
  },
  {
    title: "Study",
    es: "Estudio",
    resources: [
      { name: "Urantiapedia", about: "An online encyclopedia of the Urantia Papers.", es: { about: "Una enciclopedia en línea de los Documentos de Urantia." }, url: "https://urantiapedia.org/" },
      { name: "Urantia University Institute", about: "Structured courses on the Urantia Papers.", es: { about: "Cursos estructurados sobre los Documentos de Urantia." }, url: "https://urantiauniversity.org/" },
      { name: "TruthBook", about: "A library of articles and study materials.", es: { about: "Una biblioteca de artículos y materiales de estudio." }, url: "https://www.truthbook.com/" },
      { name: "Urantia Book Tutor", about: "Guided study and educational resources.", es: { about: "Estudio guiado y recursos educativos." }, url: "https://urantiabooktutor.com/" },
      { name: "Urantia Book Trivia", about: "Trivia and educational content about the Papers.", es: { about: "Preguntas de cultura general y contenido educativo sobre los Documentos." }, url: "https://urantiabooktrivia.com/" },
      { name: "Discover Jesus", about: "The life and teachings of Jesus as the Urantia Papers present them.", es: { about: "La vida y las enseñanzas de Jesús tal como las presentan los Documentos de Urantia." }, url: "https://discoverjesus.com/" },
      { name: "The Divine Within", about: "A site about the divine presence within, as the Papers describe it.", es: { about: "Un sitio sobre la presencia divina interior, tal como la describen los Documentos." }, url: "https://the-divine-within.com/" },
    ],
  },
  {
    title: "Listen and watch",
    es: "Escuchar y ver",
    resources: [
      { name: "Urantia Book Pod", about: "A podcast that discusses the concepts of the Papers.", es: { about: "Un pódcast que comenta los conceptos de los Documentos." }, url: "https://urantiabookpod.com/" },
      { name: "Urantia Book Network", about: "A non-profit collective of creative, educational, and technological resources, on YouTube.", es: { about: "Un colectivo sin fines de lucro de recursos creativos, educativos y tecnológicos, en YouTube." }, url: "https://www.youtube.com/@urantiabooknetwork" },
      { name: "Gary Tonge (Vision Afar)", about: "Visual presentations and animations of concepts from the Papers, on YouTube.", es: { about: "Presentaciones visuales y animaciones de conceptos de los Documentos, en YouTube." }, url: "https://www.youtube.com/@GaryTonge" },
      { name: "Divine Mother Productions", about: "Media inspired by the concepts of the Papers.", es: { about: "Medios inspirados en los conceptos de los Documentos." }, url: "https://divinemotherproductions.com/" },
    ],
  },
  {
    title: "Communities",
    es: "Comunidades",
    resources: [
      { name: "r/urantia", about: "A discussion forum on Reddit.", es: { about: "Un foro de conversación en Reddit." }, url: "https://www.reddit.com/r/urantia/" },
      { name: "Urantia", about: "A Facebook group for readers.", es: { about: "Un grupo de Facebook para lectores." }, url: "https://www.facebook.com/groups/urantiagroup" },
      { name: "Urantia Book: Science & History", about: "A Facebook group for the science and history in the Papers.", es: { about: "Un grupo de Facebook sobre la ciencia y la historia en los Documentos." }, url: "https://www.facebook.com/groups/418407648220368" },
    ],
  },
];
