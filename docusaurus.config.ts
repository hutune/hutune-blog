import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Tech Briefing',
  tagline: 'Tong hop va tom tat tin cong nghe theo dinh ky',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: process.env.SITE_URL ?? 'https://example.com',
  baseUrl: '/',

  // Keep these placeholders if you deploy with GitHub Pages later.
  organizationName: 'your-org',
  projectName: 'tech-briefing',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: {
          path: './blog',
          routeBasePath: '/',
          archiveBasePath: null,
          blogTitle: 'Tech Briefing',
          blogDescription: 'Ban tin cong nghe duoc tong hop dinh ky tu cac nguon uy tin.',
          blogSidebarTitle: 'Bai moi',
          blogSidebarCount: 20,
          postsPerPage: 10,
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom', 'json'],
            xslt: true,
          },
          editUrl:
            'https://github.com/your-org/hutune-blog/tree/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'ignore',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    metadata: [
      {
        name: 'keywords',
        content:
          'tech blog, technology summary, rss digest, automation, docusaurus',
      },
    ],
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: false,
      disableSwitch: false,
    },
    navbar: {
      title: 'Tech Briefing',
      logo: {
        alt: 'Tech Briefing Logo',
        src: 'img/logo.svg',
      },
      items: [
        {to: '/', label: 'Latest', position: 'left'},
        {to: '/tags', label: 'Topics', position: 'left'},
        {to: '/about', label: 'About', position: 'left'},
        {
          href: 'https://github.com/your-org/your-repo',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Content',
          items: [
            {label: 'Latest', to: '/'},
            {label: 'Topics', to: '/tags'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'About', to: '/about'},
            {
              label: 'Source Code',
              href: 'https://github.com/your-org/your-repo',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Tech Briefing.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
