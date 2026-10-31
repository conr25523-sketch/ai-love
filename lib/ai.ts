import { env } from 'cloudflare:workers';
import { generateProviderReply, getProviderMode } from './ai-provider.mjs';
import { resolveProviderSettings } from './ai-settings';

export type AIMode = 'demo' | 'ai';
export type AIMessage = { role: string; content?: string; text?: string };
export type ReplyInput = {
  text?: string;
  recentMessages?: AIMessage[];
  learningMessages?: AIMessage[];
  name?: string;
};

function providerConfig() {
  return resolveProviderSettings(env as Cloudflare.Env);
}

/** Secrets stay in server-side Worker bindings and are never sent to the browser. */
export async function getAIMode(): Promise<AIMode> {
  return getProviderMode(await providerConfig());
}

export async function generateReply(input: ReplyInput): Promise<{ content: string; mode: AIMode }> {
  return generateProviderReply(input, await providerConfig());
}
