import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { configuredAdminIds } from '../../../../lib/admin-access';
import { handleAISettings } from '../../../../lib/ai-settings';
import { localRuntimeEnabled } from '../../../../lib/local-runtime';

async function handle(request: Request) {
  const settings = env as Cloudflare.Env;
  if (localRuntimeEnabled(request, settings.MOONMIND_LOCAL_MODE)) return Response.json({ configured: false, model: '', ready: false, error: 'Local mode uses offline demo replies. External AI settings are disabled.' }, { status: request.method === 'GET' ? 200 : 403, headers: { 'Cache-Control': 'no-store' } });
  const identity = await getChatGPTUser();
  return handleAISettings(request, settings, identity, configuredAdminIds(identity, settings.ADMIN_USER_IDS, settings.ADMIN_EMAILS));
}
export const GET = handle;
export const POST = handle;
