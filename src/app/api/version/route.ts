export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Geeft een build-id terug zodat de frontend kan detecteren of er een nieuwe
// deployment live staat (basis voor de "Update beschikbaar" banner).
export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    'dev';
  return Response.json(
    { version },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
