import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const debug: string[] = [];

  const keyId = (process.env.B2_KEY_ID || '').trim();
  const appKey = (process.env.B2_APPLICATION_KEY || '').trim();

  try {
    // Step 1: Authorize
    const credentials = Buffer.from(`${keyId}:${appKey}`).toString('base64');
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${credentials}` },
    });
    const authData = await authRes.json();
    if (!authRes.ok) {
      debug.push(`❌ Auth failed: ${authRes.status} ${JSON.stringify(authData)}`);
      return NextResponse.json({ debug });
    }
    debug.push(`✅ Auth OK, apiUrl=${authData.apiUrl}, downloadUrl=${authData.downloadUrl}`);
    const bucketId = process.env.B2_BUCKET_ID || authData.allowed?.bucketId || '';
    debug.push(`bucketId=${bucketId}`);

    // Step 2: Test b2_get_download_authorization (v2)
    try {
      const dlAuthRes = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_download_authorization`, {
        method: 'POST',
        headers: { Authorization: authData.authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId, fileNamePrefix: '', validDurationInSeconds: 604800 }),
      });
      const dlAuthData = await dlAuthRes.json();
      if (dlAuthRes.ok) {
        debug.push(`✅ v2 download auth OK, token len=${dlAuthData.authorizationToken?.length}`);
        // Test download URL
        const testUrl = `${authData.downloadUrl}/file/${process.env.B2_BUCKET_NAME || 'video-website'}/videos/1776671060612-video_1776240223.mp4?Authorization=${dlAuthData.authorizationToken}`;
        debug.push(`Test URL: ${testUrl.substring(0, 80)}...`);
        const testRes = await fetch(testUrl, { method: 'HEAD' });
        debug.push(`HEAD test: ${testRes.status} ${testRes.statusText}`);
      } else {
        debug.push(`❌ v2 download auth failed: ${dlAuthRes.status} ${JSON.stringify(dlAuthData)}`);
      }
    } catch (err: any) {
      debug.push(`❌ v2 download auth error: ${err.message}`);
    }

    // Step 3: Test b2_get_download_authorization (v4)
    try {
      const dlAuthRes4 = await fetch(`${authData.apiUrl}/b2api/v4/b2_get_download_authorization`, {
        method: 'POST',
        headers: { Authorization: authData.authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId, fileNamePrefix: '', validDurationInSeconds: 604800 }),
      });
      const dlAuthData4 = await dlAuthRes4.json();
      if (dlAuthRes4.ok) {
        debug.push(`✅ v4 download auth OK, token len=${dlAuthData4.authorizationToken?.length}`);
      } else {
        debug.push(`❌ v4 download auth failed: ${dlAuthRes4.status} ${JSON.stringify(dlAuthData4)}`);
      }
    } catch (err: any) {
      debug.push(`❌ v4 download auth error: ${err.message}`);
    }

  } catch (err: any) {
    debug.push(`❌ Error: ${err.message}`);
  }

  return NextResponse.json({ debug });
}
