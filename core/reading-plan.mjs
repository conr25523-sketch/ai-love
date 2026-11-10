import { probeQuestion } from './deep-probe.mjs';
import { modeInvitationBlock, SWORDS_EXIT_LINE } from './reading-flow.mjs';
import { recommendMode, resolveMode } from './response-mode.mjs';
import {
  CONFIRM_INSTRUCTION, INSIGHT_INSTRUCTION, LISTEN_INSTRUCTION,
  followUpInstruction, probeInstruction, respondInstruction,
} from './reading-prompts.mjs';

/**
 * What the AI mode should do this turn of a reading round. Pure: the provider supplies
 * the flow state and this returns the instruction block, whether a structured analysis
 * call is needed first, and a deterministic post-step (invitation block, exit line).
 */
export function planReadingTurn(flow, { text = '', prior = [] } = {}) {
  const recommendation = recommendMode({ text, messages: flow.round ?? [], afterSwords: flow.afterSwords });
  const plain = content => content;
  switch (flow.stage) {
    case 'probe':
      return { stage: flow.stage, recommendation, needsAnalysis: false, finish: plain,
        instruction: probeInstruction({ layer: flow.layer, suggestedQuestion: probeQuestion(flow.layer, prior) }) };
    case 'listen':
      return { stage: flow.stage, recommendation, needsAnalysis: false, finish: plain, instruction: LISTEN_INSTRUCTION };
    case 'insight':
      return { stage: flow.stage, recommendation, needsAnalysis: true, instruction: INSIGHT_INSTRUCTION,
        finish: content => `${content}\n\n${modeInvitationBlock(recommendation)}` };
    case 'confirm':
      return { stage: flow.stage, recommendation, needsAnalysis: true, instruction: CONFIRM_INSTRUCTION,
        finish: content => `${content}\n\n${modeInvitationBlock(recommendation)}` };
    case 'respond': {
      const { mode, downgraded } = resolveMode(flow.requested, recommendation);
      return { stage: flow.stage, mode, downgraded, recommendation, needsAnalysis: true,
        instruction: respondInstruction(mode, { downgraded }),
        finish: content => mode === 'swords' && !content.includes(SWORDS_EXIT_LINE) ? `${content}\n\n${SWORDS_EXIT_LINE}` : content };
    }
    case 'follow-up': {
      const mode = flow.lastRequested === 'swords' && recommendation.swordsAllowed ? 'swords' : 'cups';
      return { stage: flow.stage, mode, recommendation, needsAnalysis: false, finish: plain, instruction: followUpInstruction(mode) };
    }
    default:
      return null;
  }
}
