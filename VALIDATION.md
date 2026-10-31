# Event-grounded social replies and conversation repair · 9 October 2026 · Asia/Bangkok

## Automatic first-visit tarot · 9 October 2026

- 174 conversation/SQLite backend checks passed. New checks cover consent before persistence, concurrent/repeated registration producing exactly one welcome spread without a provider call, correct first-choice reading against the persisted spread ID, no replay for returning or cleared profiles, atomic rollback when invitation storage fails, and reservation of the internal welcome request ID. Existing history-count assertions now include the initial assistant invitation.
- TypeScript passed. Local browser QA verified name/consent submission immediately showing the shuffle stage without a typed chat request, followed by three choices and a matching selected-card reading. Reload restores the same selected spread. No schema, credential, audience or model changes. Owned preview and synthetic local profile are removed before packaging.

## Direct requested answers and animated tarot · 9 October 2026

- 171 conversation and SQLite backend checks passed. New coverage includes the literal MBTI screenshot request, zero/sparse evidence, direct answer first, repeated wording with a consistent type, user-only preference provenance, latest corrections/negation and removal of old evidence, saved evidence beyond the recent 20-turn window, another user's exclusion, direct emotion/meaning/advice answers, and idempotent stored replies. No guessed label becomes a profile fact.
- All 22 Major Arcana have original short symbolic interpretations. Seeded spreads contain three distinct cards, vary between persisted invitation IDs, remain reproducible, and cover all 22 cards. Selected meanings match the exact card in the shared server/UI draw. One choice per invitation and safety/opt-out precedence are tested.
- TypeScript passed. Local browser QA verified a direct INTJ guess from the synthetic user's four explicit preferences, the visible shuffle stage before choices, three cards at a 390 × 844 mobile viewport, selection locking, matching The Devil/The Star readings, and the same selected card/history after reload. SVG fronts remain visible after reading. Reduced-motion handling and retry locking are implemented; these two paths were code-reviewed, not fault-injected in the browser.
- Existing auth, audience, schema, API credentials and transcript contents are unchanged. New responses use the deterministic demo and updated conversational instructions; no live generative-model call or model training was performed. Owned preview and synthetic local profile are removed before packaging.

The new screenshot identifies unwanted messenger duties instead of using a generic relationship response. The event route also distinguishes unequal group-work burdens, unwelcome personal pressure and interrupted sharing, with four varied alternatives per event. Replies acknowledge the stated friction before a related perspective, preserve listening-only requests, avoid guessed motives and recognize possible costs of refusal. Brief hesitations use only the caller's own recent substantive event; a new subject or assistant-only narrative cannot establish it. A prior irrelevant symbolic/generic reply can be repaired. Model instructions use the event/role approach. The deeper realistic guidance changes above are included in the same final publication.

Focused social-event, gentle-guidance, persona, casual and provider tests: 113 passed. Local D1 HTTP passed for the screenshot, hesitant continuation, refusal cost, three additional social scenarios, deep perspective, stored goals, opt-out/in, casual switching, safety and original history/deletion. No live model calls; provider tests use stubs. TypeScript passed. No UI layout, schema or credential changes. Owned preview stopped and own synthetic local profile removed before final packaging. Version 14 was saved during work; only the final combined source is selected for deployment.

# Realistic perspectives and reusable decision principles · 9 October 2026 · Asia/Bangkok

Revised all twenty coaching alternatives across the existing five distress categories. Each now connects a grounded difficulty to a perspective, real constraints/tradeoffs and a repeatable decision or review practice, rather than only a short-term task. Examples distinguish worth from outcomes while retaining accountability, effort from guaranteed success, feedback from identity, and personal choice from resources and negotiation limits. Possible underlying beliefs are framed conditionally. Model instructions require the same realism without nihilism, coercion, invented hidden beliefs or promises of enlightenment.

Explicit deeper follow-ups can use only the caller's previous supported user topic. No assistant-only context, unrelated new subject or prior harm signal establishes a coaching topic. User preferences, goal corrections, safety, topic changes and pacing remain enforced. Eligible deeper direction guidance precedes routine exploration; ordinary initial exploration still works.

Focused guidance/persona/provider checks: 87 passed after the final assertion correction; exploration, casual and memory regressions: 51 passed, for 138 distinct checks. TypeScript passed. Local D1 HTTP passed for real-world constraints, reusable perspective, deep follow-up, own saved goal, opt-out/opt-in, casual switches, safety, original transcript and deletion. Prior screenshot/wording HTTP regression also passed. Provider tests use stubs; no live model requests. No schema, UI layout, credentials or added inference calls. Owned preview stopped and synthetic profiles removed before packaging. Changes are phrasing/routing improvements, not evidence of changed beliefs or model training.

# Gentle life-direction guidance · 9 October 2026 · Asia/Bangkok

Added paced gentle guidance for five recognized ordinary distress categories: work pressure, social comparison/judgment, self-criticism/disappointment, relationship uncertainty and life direction. Each option acknowledges the disclosure, gives one plain-language perspective and offers an optional small action. Goals are canonical caller-reported values, bounded by saved memory, latest correction and topic relevance. A prior study goal does not divert a relationship disclosure. Advice follows an explicit request or related prior user disclosure; ordinary first disclosures keep listening. The next turn after coaching pauses guidance unless it is explicitly requested again.

Listening-only requests persist within available user context until explicit opt-in. Casual subjects and joy remain conversational. Negated distress, corrections, stop requests, risk and high-stakes decisions bypass the new path. Model instructions carry the same pacing, grounded values and action focus; raw goals remain untrusted user data. No schema, layout, credentials or added inference calls.

Distinct focused guidance, persona, provider, exploration, casual and memory checks: 135 passed across the integration and targeted follow-up runs. TypeScript passed. Local D1-backed HTTP passed for saved-goal linkage, small action, persistent listening opt-out, renewed opt-in, casual topic switch, safety and original-message persistence/deletion. The prior screenshot/wording HTTP regression also passed. No live model calls; provider tests use stubs. Owned preview stopped and synthetic profiles removed before packaging. Demo behavior remains bounded by supported phrases and finite alternatives.

# Reply wording variety · 9 October 2026 · Asia/Bangkok

Removed the ordinary “ฉันฟังอยู่” plus verbatim-user-text fallback. Alternatives are selected against recent caller-owned replies, accounting for appended questions, imagery and emojis, with least-recent use after a finite pool is exhausted. Repeated unfamiliar messages no longer enter a two-answer loop. The newest happiness-in-learning screenshot receives a direct continuation without echoing or questioning. Existing saved transcripts remain intact.

Focused variety, persona, exploration, casual and provider tests: 104 passed. Includes twelve distinct unfamiliar-message turns, four learning-happiness replies, bounded provider revision for medium-length older duplicates, negation and safety paths. TypeScript passed. Local D1 HTTP passed with 19 message requests including the screenshot, consecutive varied fallbacks and learning-happiness replies, original-message persistence and deletion. No live model calls; provider behavior uses stubs. Finite demo templates may recur after leaving the recent window. No UI layout or schema changes. Owned preview stopped and synthetic local profile removed before packaging.

# Conversational memory and short-reply continuation · 9 October 2026 · Asia/Bangkok

Ordinary demo replies no longer gate conversation on insufficient biography. The screenshot's discovery-enjoyment reply now continues exploration without recycling a goal question. Existing uncertainty, correction and safety routes remain covered.

Per-user memory is derived from the authenticated caller's latest 200 saved user messages. Supported explicit interests, dislikes, abilities, goals and question/emoji preferences are bounded; latest corrections replace old claims. Assistant messages, other visitors and request-body memory fields are excluded. Deleting history removes the memory source. UI consent and deletion copy describe this behavior. This adapts from saved history; it does not train model weights or share learned statements between visitors.

Focused language, conversation, memory, provider and SQLite backend tests: 144 passed. TypeScript passed. Local D1-backed HTTP checks passed for the screenshot continuation, older statements outside recent dialogue, session restore, learned style, corrections, same-name isolation and deletion. Provider tests use stubs; no live model calls or credential changes. No schema migration or additional inference calls. Copy changes do not alter layout.

Owned local preview stopped and synthetic verification profiles removed before packaging.

# Verification · 8 October 2026 · Asia/Bangkok

- Persona tests: 13 passed.
- Mock AI provider tests: 7 passed; no live API calls.
- SQLite backend tests using generated migration: 11 passed.
- TypeScript `tsc --noEmit`: passed after UI completion.
- Sites/Vinext production build: passed, all five build stages and four API routes.
- Local D1 migration: applied successfully.
- HTTP integration: Thai page response, local sign-in, database persistence, continued conversation, duplicate request protection, admin consent/revocation and history deletion passed.
- Synthetic local profile and messages removed after HTTP verification. Preview server stopped.

Browser rendering and client interactions were not visually verified: the session has no available browser. Production AI requires server API credentials and a model. The initial deployment had no configured administrator; see the follow-up below. Credentials and administrator allowlists are server-side and are not exposed in the client.

## Admin follow-up

Added standalone `/admin` access without requiring a chat profile and explicit entry links. Owner email allowlist is stored as a server runtime secret, derived from the Site's verified owner access policy. Authorization and backend regression tests passed 14/14. Existing ID allowlists remain supported, and admin reading still requires user consent.

TypeScript passed. Local HTTP verification passed for `/admin`, entry links, administrator API access without onboarding, and anonymous rejection; no user records were modified.

## Direct chat and public visitor access

Removed number selection from onboarding, requests and AI input. Chat starts directly after nickname/consent. Ordinary responses use natural language without repeated technical mode notices; actual runtime mode remains visible, and method questions receive truthful answers.

Anonymous visitors use an opaque 256-bit HttpOnly cookie and hashed D1 identity; same nickname does not grant access to another visitor. ChatGPT identity remains supported for existing history and required for allowlisted administrators. Missing cookies cannot create profiles or send messages until the browser establishes its visitor session.

Persona, provider, backend, owner authorization and visitor-session tests: 41 passed. Local HTTP integration passed for anonymous onboarding, cookie restore, same-name history isolation, authenticated admin consent/revocation, direct greeting, rejected legacy number requests and deletion. No live AI calls. Synthetic local records removed and preview stopped. Browser/client interaction visual QA remains unavailable.

TypeScript passed after visitor API and UI completion.

## Reflection-first replies · 9 October 2026 · Asia/Bangkok

Ordinary demo replies now reflect the user's words and offer small options without a closing question. Ambiguous requests can receive one clarification; a question in either of the last two assistant messages suppresses another ordinary question. Safety checks remain available. Corrections and “I don't know” receive acknowledgement without probing. Configured-model instructions carry the same pacing and require tentative, grounded observations.

Focused persona/provider regression checks cover ordinary topics, uncertain feelings, corrections, necessary clarification, repeated-question suppression, safety exceptions and provider instructions. No live model API calls; deployed mode remains demo. Interface and storage unchanged.

Focused persona/provider tests: 25 passed. TypeScript passed with incremental output disabled.

Added occasional, explicitly symbolic star imagery linked to the shared topic. A recent symbolic reply suppresses imagery for the next four assistant replies. Safety, corrections and negative self-worth disclosures bypass imagery. Demo behavior and configured-model instructions both implement the spacing; no supernatural forecast or hidden personality claim is generated. Expanded focused tests: 29 passed, including spacing and safety bypasses. No live AI calls.

## Repetition and screenshot regression · 9 October 2026 · Asia/Bangkok

Fixed short new disclosures inheriting an unrelated previous topic. The exact screenshot sequence now moves from future uncertainty to social judgement/self-perception. Metaphor does not override explicit safety signals. Ordinary responses are shorter, avoid automatic advice and do not repeat technical notices. Demo history omits the current stored user message when evaluating prior turns, preventing false repetition detection.

Configured provider rejects long exact duplicate replies after one contextual revision, shares the original timeout, and allows explicitly requested repeats or short acknowledgements. No live API calls. Production environment inspection confirmed no model or API key; OpenAI Developers was suggested for the required connection. Genuine free-form conversation remains pending provider credentials, not solved by template changes.

Focused persona/provider tests: 41 passed. TypeScript passed. Local HTTP verified actual D1-backed messages for the screenshot sequence and repeated disclosures; synthetic profiles removed and owned preview stopped. No browser visual changes were made.

## Owner API key entry · 9 October 2026 · Asia/Bangkok

Added `/admin/settings` and the owner navigation item. Owner enters their own OpenAI API key in a masked field; it is cleared after submission, never stored in browser storage, and never returned by settings endpoints. Trusted owner identity is required server-side, with same-origin JSON and bounded bodies for writes. A short synthetic Responses request verifies actual generation access before saving; failure preserves the previous settings. The UI states that this test and chat use API billing.

Credentials are AES-256-GCM encrypted with a random nonce and authenticated application context before D1 storage. The master key is a separate runtime secret. Chat resolves saved settings per request, so successful key changes need no new deployment. Environment-only configuration remains compatible. New schema-only Drizzle migration inspected and applied locally.

Settings, provider, backend and owner authorization tests: 34 passed. TypeScript passed. Local HTTP verified route, owner login, anonymous denial, origin protection and redacted status; no external AI calls or D1 writes. Browser checked the owner form and rejected invalid input, clearing the input with an actionable error. No genuine OpenAI key was provisioned or tested; activation awaits the owner's valid key.
# Thai slang interpretation · 9 October 2026 · Asia/Bangkok

Added local lexical analysis for common abbreviations, known misspellings and allowlisted elongated words, with contextual hints for ambiguous slang and ghost. Both demo and configured provider consume the clues. Negation and laughter are preserved; unknown slang and names are not assigned emotions. Original messages remain unchanged in the conversation history. User-derived clues are bounded and kept in user-role data, never model instructions.

Focused language/persona/provider tests: 64 passed. TypeScript passed. Provider tests use stubbed responses only, including raw-message preservation, caller-history isolation and hostile input. No live AI requests or key changes. UI, audience, admin access and hosting controls remain unchanged. Cancelled local hosting/provider experiments are parked in ignored `work/` and excluded from publication.
# Adaptive conversation · 9 October 2026 · Asia/Bangkok

Added bounded casual conversation for explicit everyday topics, playful requests, grounded congratulations and proportionate emojis. The demo follows new topics without forcing counselling, varies consecutive responses, respects emoji opt-out, and defers distress and grief to support/safety paths. A later greeting no longer restarts the opening question. Unknown input receives a brief acknowledgement without repeated interrogation.

The screenshot's requests to explain “ค้นหา” now use the preceding exploration context and give a concrete answer. The model prompt also prioritizes direct explanations and topic changes, with optional humour and emojis. No new API requests, credentials, database fields, hosting controls or UI changes.

Language/persona/casual/provider tests: 87 passed. TypeScript passed. Local HTTP exercised actual persisted chat for the screenshot clarification, a tea topic switch, a later greeting, congratulations, distinct repeated replies and raw-message preservation; synthetic history removed. Provider tests use stubbed responses, so no live-model tone evaluation was performed. The deterministic demo remains limited to supported patterns.
# Broad exploration guidance · 9 October 2026 · Asia/Bangkok

Recognized short education, career and self-discovery messages now receive a small starting point instead of requiring more biography. The math screenshot distinguishes the stated ability from preference, then uses the explicitly stated enjoyment of challenges to explore process versus content. A single optional life-goal question follows guidance; recent questions, existing goal questions within bounded caller history and opt-outs prevent repeated questioning. Uncertain goal replies receive optional small actions. No major, personality or hidden feeling is inferred.

General ambiguous choices retain their own topic. Existing work/choice uncertainty replies also offer a reversible starting point. Configured-model guidance follows the same policy with original user input kept in user-role data. No UI, database, secrets, access or billing changes.

Focused language, casual, exploration, persona and provider tests: 108 passed. TypeScript passed. Local HTTP verified persisted short study guidance, question pacing through the full interleaved history, both math screenshot turns, and the preceding casual flow. Synthetic test profiles and history removed; owned preview stopped. Provider requests were stubbed only; no live model evaluation or credential changes.
# Local conversation refactor · 31 October 2026 · Asia/Bangkok

## Local configuration recovery after folder audit

- Restored missing tracked `vite.config.ts` from the existing Git HEAD and recreated `vite.local.config.ts` with the same isolated loopback-only runtime. Local startup now checks that its Vite configuration exists before preparing state or migrations.
- Updated `Start-Moonmind.ps1` to use the local runtime and Node 24 requirement. This machine blocks PowerShell scripts, so added `Start-Moonmind.cmd` and verified it boots the same local server using the available Node runtime without changing execution policy.
- Local-runtime unit tests 5/5, TypeScript no-emit, migration/preflight check, local HTTP smoke and all three page responses passed. HTTP used only generated local synthetic profiles and cleaned them up. No database reset, old experiment-file cleanup, GitHub push or public deployment was performed.

- Development stays in this checkout. No source push, hosted version save or public deployment. `npm run local` starts a loopback-only Vinext/Workers/D1 simulation with automatic checked-in migrations and new persistent state under ignored `.moonmind-local/`. It uses simulated owner sign-in and forces deterministic replies, ignoring inherited/stored external AI credentials. Original preview and production data were not migrated or removed.
- Added bounded dialogue context for turn intent, the person/event being discussed, corrections, negation, current topic and resolved events. New replies support sendable drafts and shortening, concrete comparisons, grief, listening, mixed feelings and repairs. Follow-up details no longer automatically become a different person's problem. Third-party stories, fictional pets and medical homonyms have boundary checks.
- Delivery preserves short greetings, laughter, thanks, goodbyes and stop requests without three-line padding. Work fatigue without a stated cause does not assert that others assigned extra tasks. Requested personality conclusions use supported cues or partial/open results rather than default INFP/Enneagram 5, and explanation requests refer to the result actually given.
- Final checks passed: 260 conversation/backend/identity tests, 5 dedicated local-runtime tests, TypeScript no-emit and the local HTTP smoke. HTTP covered persistence and same-name return, cross-browser isolation, initial tarot, local owner, header/origin rejection, disabled external API settings and permanent admin deletion using only generated synthetic records. `/`, `/admin` and `/admin/settings` served 200. Replayed the original 13 synthetic conversations/46 user turns into `outputs/conversation-review-2026-10-31-after.md`; none had adjacent exact duplicate answers. This is a bounded regression sample, not proof of general language understanding.
- UI code exposes local status and simulated owner labels, disables external settings locally, retains pre-wrap, and shows pending status only during actual requests. Visual browser/mobile QA could not run: Computer Use stopped because it could not establish the current browser URL confidently. No further browser input was attempted. HTTP/compile checks do not establish visual layout or client interaction correctness.
- README and README-LOCAL document Node 24+, installation/start/check commands, data locations and GitHub's source-only role. Runtime databases, credentials, outputs and generated TypeScript build metadata are excluded. Dependencies were already installed; a fresh dependency installation on another machine was not tested. The conversation engine remains finite local rules, not a new locally trained language model.

# Conversational pronoun and human realism · 9 October 2026 · Asia/Bangkok

- Updated assistant-owned wording to เรา, preserving user-pronoun parsing and original recalled user statements.
- Added bounded demo lenses for appearance/attraction and mixed motives, plus provider guidance for context-relevant darker perspectives. No body contempt, presumed hidden motives, universal cynicism, or guaranteed worldview change.
- New tests exercise four distinct appearance replies, mixed motives, listening-only, body distress, topic changes, safety precedence, provider instructions and unchanged user text. Existing persona, casual, social boundaries, gentle guidance, memory and provider regressions included: 131/131 passed.
- TypeScript no-emit passed. Provider checks use synthetic credentials and mocked responses; no live model calls or new settings. No UI, schema or production-history changes.
# First-disclosure problem explanation · 9 October 2026 · Asia/Bangkok

Production persona/provider routes now opt into a shared disclosure mode: supported work, social judgement, self-disappointment, relationship and distressed-direction topics receive an explanation on the first turn and continue after prior coaching. Reflections include a conditional human tension, real constraints and a reusable perspective. Specific peer roles add relevant costs and motives without assuming another person's intentions. A bounded fallback for explicitly stated unsupported problems offers conditional framing instead of a one-line invitation to explain again. Effort-plus-problem disclosures bypass casual praise. Unknown names, negation, listening-only requests, topic changes, safety and initial career exploration retain their routes. Symbolic imagery is requested rather than spontaneously added to problem explanations.

Checks: 156/156 tests passed across problem explanation, persona, guidance, social roles, human realism, casual chat, exploration, memory and provider suites. TypeScript no-emit passed. Local D1 HTTP passed first disclosure, further problem detail, broad problem, listening-only, topic change, safety and unchanged original history. Provider checks use mocks; no live model calls or settings changes. The owned server was stopped and the exact synthetic local profile removed. No UI, schema or production-history changes. These are bounded rule/prompt improvements, not proof of changed beliefs or model self-training.
# Demo reply pacing and correction continuation · 9 October 2026 · Asia/Bangkok

The chat displays successful ordinary demo replies after a minimum 2 seconds from submission; urgent safety replies, errors and real model replies bypass the presentation delay. No model reasoning effort, API code, credentials or provider settings were changed. Corrective disclosures acknowledge the misunderstanding and reclassify the supplied new details, preserving negation, safety and listening-only preferences and suppressing symbolic imagery during repair. Bare or repeated correction does not invent a replacement explanation. Initial career exploration and ambiguous ordinary requests in the production persona no longer ask a routine follow-up; bounded conditional guidance remains distinct from pretending to know undisclosed facts.

127/127 pure conversation tests passed, including new correction/low-information cases and persona, casual, exploration, guidance, social and memory regressions. TypeScript no-emit passed. Chrome QA on the local rules demo verified the preparation state at approximately 1.3 seconds, completed study guidance without a goal question, correction acknowledgement plus the new math/preference explanation, and a safety reply displayed before 2 seconds without the added wait. The QA tab/server were closed and the exact synthetic local profile removed. No production data, schema, access or API settings changes; no live model calls. Official OpenAI reasoning documentation was consulted for the conceptual distinction between presentation delay and model-dependent reasoning effort.
# Three-line delivery and detailed stated-conflict analysis · 9 October 2026

- 148 conversation and SQLite backend checks passed: three nonempty content lines, meaningful disclosure continuations, evidence-based conflict plans, negation and subject boundaries, safety, listening-only, stopping, history persistence and idempotent retries. Both delivery modes are covered by fixture responses; there were no outbound model calls.
- TypeScript `--noEmit --incremental false` passed after typing the pure delivery formatter.
- Chrome local UI QA with a synthetic profile: a workload/income disclosure produced three explicit lines with the stated conflict, a bounded human-tendency perspective, and realistic negotiation/decision criteria. DOM inspection confirmed three nonempty newline-delimited lines and computed `white-space: pre-wrap`.
- Existing stored conversations are not rewritten. The change formats newly completed replies before persistence and updates demo analysis plus the system prompt; it does not provision a model or increase real model reasoning effort.
# INFJ-style MBTI / Enneagram reflection · 9 October 2026 · Asia/Bangkok

- 158 conversation/SQLite backend checks passed, including all 16 MBTI combinations, all 9 Enneagram lenses, evidence/provenance, own latest self-report and negation, valid versus invalid wing tokens, questions versus self-reports, assistant/third-party/example exclusion, conditional motive analysis, pacing, safety, listening-only, corrections, and topic-switch precedence.
- TypeScript `--noEmit --incremental false` passed. No live model calls were made and no provider/key settings were changed.
- Local Chrome QA with a synthetic profile: an explicit `INFJ 6w5` self-report received four substantive lines covering both frameworks, without new questions or a claimed diagnosis. The following workload/income disclosure preserved the concrete problem explanation and used the self-reported Enneagram label only as a conditional supplementary lens.
- Existing data, audience and auth behavior are preserved. The new deterministic demo behavior and prompt are checked; this is not a clinical MBTI/Enneagram assessment, generative-model evaluation, or model-training change.

## Guest logout · 9 October 2026

- 31 cookie/session and SQLite backend tests passed, including same-origin logout, method/origin rejection without clearing cookies, root HttpOnly cookie expiry, idempotent logout, HTTP preview support, fresh guest identity, and same-nickname history isolation while retaining the previous transcript in storage. TypeScript passed.
- Local browser QA verifies the ordinary guest logout button, mobile menu at 390 × 844, return to the landing page in both open guest tabs, and an empty name/consent form after logout. Reusing the same synthetic nickname starts a fresh tarot invitation without the prior message. No schema, audience, AI provider or administrator sign-out changes.

## Plain-language tarot readings · 9 October 2026

- Rewrote all 22 original readings into ordinary Thai: a short, tentative fortune-style opening, an explanation of the image, a daily-life example or clarification, and a usable next step. Updated model instructions to request the same order and plain language. No certainty, invented personal facts or guaranteed outcomes added.
- Existing tarot, persona, SQLite backend and stubbed-provider checks cover matching selected cards, persistent spreads, one choice per round, safety/opt-out priority and saved responses. The provider suite had an outdated expectation of one routine goal question despite the existing chat route's askGoal: false; that assertion is aligned with the already tested no-question behavior. No real provider call or historical-message rewrite.

## Resumable guest logout · 9 October 2026

- Corrected logout to suspend access instead of discarding the browser identity. Re-entry with the same nickname restores the same profile and transcript; different nicknames get separate profiles scoped to the browser's secret. Existing legacy profiles remain reachable by their own nickname when their original cookie is present. Names and profile selectors never select another browser's transcript.
- 34 visitor/session and SQLite backend tests passed. Coverage includes logout/re-entry, preserved messages and initial tarot IDs, nickname switching and return, name normalization, cross-browser isolation, legacy compatibility, origin/consent checks before profile selection, and HttpOnly cookie flags. TypeScript and local guest HTTP smoke passed, including blocked reads/writes after logout and full-history restoration after re-entry. The earlier cookie-clearing logout entry documents the superseded behavior.
- Local browser QA at 390 × 844 verifies logout through the mobile menu, a blank landing form, and the original synthetic message after re-entering the same nickname. No schema or administrator sign-out changes. Old histories whose identity cookie was already erased by an earlier release cannot safely be recovered from a nickname alone.

## Admin permanent account deletion · 9 October 2026

- Added a shared confirmation dialog to both administrator history views. It snapshots the selected name and full ID, warns about permanent profile/transcript/memory deletion, focuses Cancel, traps keyboard focus, allows cancellation, prevents duplicate submission and reports server errors. Successful deletion removes that selected record and transcript from the view. Administrator profiles are protected.
- 41 backend, visitor-session and admin-access checks passed, plus TypeScript no-emit. New tests cover exact-ID deletion with duplicate names, cascade of messages/requests, identity/role/origin/confirmation checks, private profiles, protected admins, rollback after a cascade error and late generation after deletion/re-registration. No live model calls.
- Local D1 HTTP smoke passed the actual DELETE route, guest denial, exact-name confirmation, duplicate-name isolation, removed profile/history and fresh re-entry. D1 includes cascading rows in its change count; success uses DELETE RETURNING to identify the selected profile rather than assuming one total changed row.
- Chrome local QA at 390 × 844 verified the delete trigger, readable name/full ID in the confirmation dialog, initial Cancel focus and cancellation preserving the record. Actual synthetic deletion was exercised through HTTP; browser UI verification stopped before final deletion. Only exact owned local test profiles were removed, with no production records deleted by the agent. Existing schema, audience, provider settings and ordinary logout are unchanged.

