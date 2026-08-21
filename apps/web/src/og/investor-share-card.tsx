import type { ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import type { InvestorShareCardModel } from '@/lib/share-card-model';

export const INVESTOR_OG_SIZE = { width: 1200, height: 630 };

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
};

function Frame({ children, accent }: { children: ReactNode; accent: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 64px',
        background: '#050505',
        color: '#ffffff',
        fontFamily: 'system-ui, Segoe UI, Arial, sans-serif',
        position: 'relative',
      }}
    >
      {accent ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            background: '#22c55e',
          }}
        />
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#22c55e', fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
            INVESTOR
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, color: '#dbeafe' }}>
            TRUST HUB
          </span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1, color: '#4ade80' }}>
          ASK TRUST HUB NETWORK
        </span>
      </div>
      {children}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700 }}>
        <span style={{ color: '#cbd5e1' }}>Independent investor research</span>
        <span style={{ color: '#22c55e' }}>investortrusthub.com</span>
      </div>
    </div>
  );
}

export function renderInvestorShareImage(model: InvestorShareCardModel) {
  return new ImageResponse(
    (
      <Frame accent={model.kind !== 'fallback'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1020 }}>
          {model.eyebrow ? (
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: '#4ade80' }}>
              {model.eyebrow}
            </div>
          ) : null}
          <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.08 }}>{model.title}</div>
          {model.subtitle ? <div style={{ fontSize: 28, fontWeight: 600 }}>{model.subtitle}</div> : null}
          {model.fact ? <div style={{ fontSize: 22, color: '#cbd5e1' }}>{model.fact}</div> : null}
        </div>
      </Frame>
    ),
    { ...INVESTOR_OG_SIZE, headers: CACHE_HEADERS },
  );
}
