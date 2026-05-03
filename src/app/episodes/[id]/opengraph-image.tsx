import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Nova Podcast Episode';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom, #000000, #1a1a1a)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#00ff00', marginBottom: 20 }}>
            Nova
          </div>
          <div style={{ fontSize: 32, color: '#ffffff' }}>
            Podcast Episode
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
