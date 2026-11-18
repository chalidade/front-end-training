import { defineConfig, type DefaultTheme } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { phases, stages } from "./stages";
import { taskList } from "@chalidade/learn-theme/markdown";

const REPO = "https://github.com/chalidade/front-end-training";



function sidebar(lang: "id" | "en"): DefaultTheme.Sidebar {
  const p = lang === "id" ? "" : "/en";
  const t = (id: string, en: string) => (lang === "id" ? id : en);

  const roadmapGroups: DefaultTheme.SidebarItem[] = phases.map((phase) => ({
    text: phase[lang],
    collapsed: false,
    items: stages.slice(...phase.range).map(({ slug, title }) => ({
      text: `${slug.slice(0, 2)} · ${title}`,
      link: `${p}/roadmap/${slug}`,
    })),
  }));

  const intro: DefaultTheme.SidebarItem = {
    text: t("Mulai", "Start here"),
    items: [
      { text: t("Apa itu fet?", "What is fet?"), link: `${p}/guide/` },
      { text: t("Metode belajar", "How to learn"), link: `${p}/how-to-learn` },
      { text: t("Catatan eksperimen", "Experiment notes"), link: `${p}/notes/` },
    ],
  };

  return {
    [`${p}/roadmap/`]: [
      intro,
      { text: t("Peta roadmap", "Roadmap overview"), link: `${p}/roadmap/` },
      ...roadmapGroups,
    ],
    [`${p}/deep-dives/`]: [
      {
        text: "Deep dives",
        items: [
          { text: t("Daftar topik", "All topics"), link: `${p}/deep-dives/` },
          { text: "Event Loop", link: `${p}/deep-dives/event-loop` },
          { text: "Browser Rendering Pipeline", link: `${p}/deep-dives/browser-rendering-pipeline` },
          { text: "CSS Cascade & Specificity", link: `${p}/deep-dives/css-cascade` },
          { text: "HTTP Caching", link: `${p}/deep-dives/http-caching` },
          { text: t("Efisiensi di React", "Efficiency in React"), link: `${p}/deep-dives/react-efficiency` },
          { text: t("Cara kerja V8", "How V8 works"), link: `${p}/deep-dives/v8` },
          { text: "Accessibility tree", link: `${p}/deep-dives/accessibility-tree` },
          { text: "React Fiber", link: `${p}/deep-dives/react-fiber` },
          { text: "Signals", link: `${p}/deep-dives/signals` },
          { text: t("Module bundler dari nol", "Module bundler from scratch"), link: `${p}/deep-dives/module-bundler` },
        ],
      },
    ],
    [`${p}/toolkit/`]: [
      {
        text: "Toolkit",
        items: [
          { text: t("Ringkasan", "Overview"), link: `${p}/toolkit/` },
          { text: "@chalidade/utils", link: `${p}/toolkit/utils` },
          { text: "@chalidade/tokens", link: `${p}/toolkit/tokens` },
          { text: "@chalidade/react-hooks", link: `${p}/toolkit/react-hooks` },
        ],
      },
    ],
    [`${p}/`]: [intro, { text: "Roadmap", link: `${p}/roadmap/` }],
  };
}

function nav(lang: "id" | "en"): DefaultTheme.NavItem[] {
  const p = lang === "id" ? "" : "/en";
  const t = (id: string, en: string) => (lang === "id" ? id : en);
  return [
    { text: "Roadmap", link: `${p}/roadmap/`, activeMatch: `^${p}/roadmap/` },
    {
      text: t("Ruang Belajar", "Learning Room"),
      link: lang === "id" ? "/ruang-belajar" : "/en/learning-room",
      activeMatch: lang === "id" ? "^/ruang-belajar" : "^/en/learning-room",
    },
    {
      text: t("Komunitas", "Community"),
      link: lang === "id" ? "/komunitas/" : "/en/community/",
      activeMatch: lang === "id" ? "^/(komunitas|profil)" : "^/en/(community|profile)",
    },
    {
      text: t("Dokumentasi", "Docs"),
      activeMatch: `^${p}/(guide|how-to-learn|notes|deep-dives|toolkit)`,
      items: [
        { text: t("Apa itu fet?", "What is fet?"), link: `${p}/guide/` },
        { text: t("Metode belajar", "How to learn"), link: `${p}/how-to-learn` },
        { text: "Deep dives", link: `${p}/deep-dives/` },
        { text: "Toolkit", link: `${p}/toolkit/` },
      ],
    },
  ];
}

export default withMermaid(
  defineConfig({
    title: "fet",
    description: "Front-End Training: roadmap, deep dives, and installable toolkits for front-end developers.",
    base: "/front-end-training/",
    cleanUrls: true,
    lastUpdated: true,
    srcExclude: ["templates/**"],
    markdown: {
      config: (md) => md.use(taskList),
    },
    head: [
      ["link", { rel: "icon", type: "image/svg+xml", href: "/front-end-training/logo.svg" }],
      ["meta", { name: "theme-color", content: "#4f46e5" }],
    ],

    locales: {
      root: {
        label: "Bahasa Indonesia",
        lang: "id-ID",
        description: "Roadmap, panduan deep dive, dan toolkit front-end yang bisa di-install.",
        themeConfig: {
          nav: nav("id"),
          sidebar: sidebar("id"),
          outline: { label: "Di halaman ini", level: [2, 3] },
          docFooter: { prev: "Sebelumnya", next: "Berikutnya" },
          lastUpdated: { text: "Terakhir diperbarui" },
          editLink: { pattern: `${REPO}/edit/main/docs/:path`, text: "Perbaiki halaman ini di GitHub" },
          returnToTopLabel: "Kembali ke atas",
          sidebarMenuLabel: "Menu",
          darkModeSwitchLabel: "Tema",
          langMenuLabel: "Ganti bahasa",
        },
      },
      en: {
        label: "English",
        lang: "en-US",
        link: "/en/",
        themeConfig: {
          nav: nav("en"),
          sidebar: sidebar("en"),
          outline: { level: [2, 3] },
          editLink: { pattern: `${REPO}/edit/main/docs/:path`, text: "Edit this page on GitHub" },
        },
      },
    },

    themeConfig: {
      logo: "/logo.svg",
      socialLinks: [{ icon: "github", link: REPO }],
      search: {
        provider: "local",
        options: {
          locales: {
            root: {
              translations: {
                button: { buttonText: "Cari", buttonAriaLabel: "Cari" },
                modal: {
                  noResultsText: "Tidak ada hasil untuk",
                  resetButtonTitle: "Hapus pencarian",
                  footer: { selectText: "pilih", navigateText: "navigasi", closeText: "tutup" },
                },
              },
            },
          },
        },
      },
      footer: {
        message: "MIT License",
        copyright: "© 2026 Chalid Ade Rahman",
      },
    },
  }),
);
