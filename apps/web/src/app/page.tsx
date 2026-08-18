import { StatusLegend } from '@ith/ui';
import { HomeHero } from '@/components/home-hero';
import { HomePaths } from '@/components/home-paths';
import { HomePrinciples } from '@/components/home-principles';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Research before you invest.',
  path: '/',
});

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
