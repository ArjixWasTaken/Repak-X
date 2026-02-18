import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title} Documentation</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/XzantGaming/Repak-X/releases">
            Download
          </Link>
        </div>
      </div>
    </header>
  );
}

const FeatureList = [
  {
    title: 'Easy Mod Installation',
    description:
      'Drag & drop PAK files, folders, or archives to install mods instantly. Supports Legacy PAK and IO Store formats with automatic detection.',
  },
  {
    title: 'Advanced Mod Management',
    description:
      'Search, filter, and organize your mod library with tags, categories, and character filtering. Switch between card and list views.',
  },
  {
    title: 'Share & Protect',
    description:
      'Create encrypted modpacks to share with others. Protect your mods with AES-256 encryption and asset obfuscation.',
  },
];

function Feature({title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {FeatureList.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
