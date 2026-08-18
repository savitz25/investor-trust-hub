import { StatusLegend } from '@ith/ui';
import { HomeHero } from '@/components/home-hero';
import { HomePaths } from '@/components/home-paths';
import { HomePrinciples } from '@/components/home-principles';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Research before you invest.',
    path: '/',
    host: await readRequestHost(),
  });
}

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomePaths />
      <HomePrinciples />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <StatusLegend />
      </section>
    </>
  );
}
