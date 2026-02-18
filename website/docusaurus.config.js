// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Repak X',
  tagline: 'The Definitive Marvel Rivals Mod Installer & Manager',
  favicon: 'img/favicon.ico',

  url: 'https://xzantgaming.github.io',
  baseUrl: '/Repak-X/',

  organizationName: 'XzantGaming',
  projectName: 'Repak-X',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/XzantGaming/Repak-X/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Repak X',
        logo: {
          alt: 'Repak X Logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/XzantGaming/Repak-X',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://discord.gg/nrud2gjUJk',
            label: 'Discord',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/getting-started',
              },
              {
                label: 'Features',
                to: '/docs/features/mod-installation',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/nrud2gjUJk',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/XzantGaming/Repak-X',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Releases',
                href: 'https://github.com/XzantGaming/Repak-X/releases',
              },
              {
                label: 'Marvel Rivals Modding',
                href: 'https://discord.gg/marvelrivalsmodding',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Repak X. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['rust', 'toml', 'bash', 'json'],
      },
    }),
};

export default config;
