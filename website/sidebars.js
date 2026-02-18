/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/mod-installation',
        'features/mod-management',
        'features/obfuscation-encryption',
        'features/mod-sharing',
        'features/io-store',
        'features/extract-assets',
        'features/clash-detection',
        'features/game-integration',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/installing-mods',
        'guides/creating-modpacks',
        'guides/browser-extension',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: [
        'advanced/architecture',
        'advanced/contributing',
      ],
    },
    'faq',
  ],
};

export default sidebars;
