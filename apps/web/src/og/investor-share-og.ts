import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import {
  branchesForFirm,
  FIRM_KIND_LABELS,
  getFirmBySlug,
  isOfficialFirmSlug,
} from '@ith/domain';
import { hasDatabaseUrl } from '@/lib/db';
import { getCachedOfficialFirmBySlug } from '@/lib/firms/cached';
import { renderInvestorShareImage } from '@/og/investor-share-card';
import {
  investorOfficialFirmShareModel,
  investorResearchShareModel,
  investorSyntheticFirmShareModel,
  type InvestorShareCardModel,
} from '@/lib/share-card-model';

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
};

function fallbackPngPath(): string {
  const local = join(process.cwd(), 'public/opengraph-image.png');
  const monorepo = join(process.cwd(), 'apps/web/public/opengraph-image.png');
  if (existsSync(local)) return local;
  if (existsSync(monorepo)) return monorepo;
  return local;
}

export function investorFallbackPng(): NextResponse {
  const buf = readFileSync(fallbackPngPath());
  return new NextResponse(buf, { status: 200, headers: PNG_HEADERS });
}

export function shareOgHead(): NextResponse {
  return new NextResponse(null, { status: 200, headers: { 'Content-Type': 'image/png' } });
}

export function renderInvestorCardOrFallback(model: InvestorShareCardModel | null) {
  if (!model) return investorFallbackPng();
  try {
    return renderInvestorShareImage(model);
  } catch {
    return investorFallbackPng();
  }
}

export function investorResearchCard() {
  return renderInvestorCardOrFallback(investorResearchShareModel());
}

export async function resolveInvestorFirmCard(slug: string): Promise<InvestorShareCardModel | null> {
  const decoded = decodeURIComponent(String(slug ?? '').trim());
  if (!decoded) return null;

  if (isOfficialFirmSlug(decoded) && hasDatabaseUrl()) {
    try {
      const report = await getCachedOfficialFirmBySlug(decoded);
      if (report?.displayName) {
        return investorOfficialFirmShareModel({
          name: report.displayName,
          city: report.office?.city,
          region: report.office?.region,
          crd: report.crd,
        });
      }
    } catch {
      return null;
    }
  }

  const firm = getFirmBySlug(decoded);
  if (!firm?.displayName) return null;
  const branch = branchesForFirm(firm.id)[0];
  return investorSyntheticFirmShareModel({
    name: firm.displayName,
    city: branch?.city,
    region: branch?.region,
    kindLabel: firm.kinds[0] ? FIRM_KIND_LABELS[firm.kinds[0]] : null,
  });
}
