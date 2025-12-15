import { ImageResponse } from 'next/og';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 72,
          background:
            'radial-gradient(900px 450px at 18% 25%, rgba(212,175,55,0.24) 0%, rgba(212,175,55,0) 60%), radial-gradient(900px 450px at 80% 70%, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0) 65%), linear-gradient(180deg, #0B0D14 0%, #0F1119 100%)',
          color: '#E8E6E3',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 26, letterSpacing: 6, fontWeight: 700, opacity: 0.9 }}>
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 800 }}>
            Fantasy Open World RPG
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.3, maxWidth: 980, opacity: 0.85 }}>
            {SITE_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    size
  );
}

