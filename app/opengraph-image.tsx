import { ImageResponse } from 'next/og';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background:
            'radial-gradient(900px 450px at 15% 20%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0) 60%), radial-gradient(900px 450px at 85% 80%, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0) 60%), linear-gradient(180deg, #0B0D14 0%, #0F1119 60%, #0B0D14 100%)',
          color: '#E8E6E3',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                backgroundColor: '#D4AF37',
                boxShadow: '0 0 18px rgba(212,175,55,0.7)',
              }}
            />
            <div style={{ fontSize: 26, letterSpacing: 6, fontWeight: 700, opacity: 0.9 }}>
              {SITE_NAME}
            </div>
          </div>

          <div style={{ fontSize: 74, lineHeight: 1.05, fontWeight: 800 }}>
            Fantasy Open World RPG
          </div>

          <div style={{ fontSize: 30, lineHeight: 1.3, maxWidth: 900, opacity: 0.85 }}>
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 22,
            opacity: 0.8,
          }}
        >
          <div style={{ letterSpacing: 3 }}>realms</div>
          <div style={{ color: '#D4AF37', fontWeight: 700 }}>Step into the world</div>
        </div>
      </div>
    ),
    size
  );
}

