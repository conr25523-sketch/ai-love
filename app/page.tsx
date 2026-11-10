"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronRight, CircleHelp, Heart, History, LoaderCircle, LogOut, Menu, MessageCircle, Moon, ShieldCheck, Sparkles, Star, Swords, Trash2, X } from "lucide-react";
import { drawTarotCards } from "../core/tarot-deck.mjs";
import { MODE_REQUEST, modeChoiceFor } from "../core/reading-markers.mjs";
import { conversationSuggestions } from "../core/conversation-navigation.mjs";
import DeleteUserButton from "../components/delete-user-button";
import { adminUrl, chatFetch, homeUrl } from "../lib/pages-client";

type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: number };
type Session = { user: { id: string; name: string; consentAdmin: boolean } | null; isAdmin: boolean; authenticated: boolean; mode: "demo" | "ai"; localMode?: boolean };
type HistoryUser = { id: string; name: string; updatedAt: number; messageCount: number; canDelete: boolean };
type CardNumber = 1 | 2 | 3;
type CardSelection = { number: CardNumber; requestId: string };
type DrawnTarotCard = { id: number; name: string; title: string; numeral: string; symbol: string };
const CARD_INVITATION = "เลือกไพ่หนึ่งใบจากสามใบด้านล่าง";
const CARD_SELECTION = /^เราเลือกไพ่ใบที่ ([123])$/;
const LOGOUT_EVENT = "moonmind:guest-logout";

function TarotMotif({ card }: { card: DrawnTarotCard }) {
  switch (card.id) {
    case 0: return <g><circle cx="35" cy="25" r="5" /><path d="m34 31-7 22 14 9-5 20M33 51l-11 17M37 36l18-7M26 39l-10-6M48 83l6-18 15 5M58 18v17M54 22l8-5" /><circle cx="59" cy="16" r="3" /></g>;
    case 1: return <g><path d="M21 26c0-11 15-11 19 0s19 11 19 0-15-11-19 0-19 11-19 0ZM24 54h33v5H24zM29 60v22M53 60v22M32 48l8-14 8 14M40 40V23M17 37l8-9M58 39l6-10" /><circle cx="31" cy="66" r="3" /><path d="M43 64h6v7h-6z" /></g>;
    case 2: return <g><path d="M17 29v51M63 29v51M13 28h8M59 28h8M29 70l4-34h14l5 34H29ZM33 34l7-9 7 9M29 78c8 8 20 5 24-1-8 3-15-3-14-10-6 1-9 5-10 11Z" /><circle cx="40" cy="42" r="3" /><path d="M37 52h6v12h-6" /></g>;
    case 3: return <g><path d="m25 35 1-15 9 7 5-12 5 12 9-7 1 15H25ZM22 66c8-13 28-13 36 0M29 66l-5 13M51 66l5 13M16 67V42M12 47l4 4 4-4M12 55l4 4 4-4M64 67V42M60 47l4 4 4-4M60 55l4 4 4-4" /><circle cx="40" cy="46" r="5" /></g>;
    case 4: return <g><path d="M21 41V29h38v12M17 43h10v34H17zM53 43h10v34H53zM26 65h28M27 72h26M28 79v6M52 79v6M28 27l1-10 7 5 4-9 4 9 7-5 1 10H28Z" /><path d="M34 42h12v15H34zM37 36h6" /></g>;
    case 5: return <g><path d="M40 16v40M31 24h18M32 33h16M35 42h10M22 63l35 19M25 58l35 19M58 63 23 82M55 58 20 77M19 78l4 7M58 77l3 7" /><circle cx="21" cy="60" r="5" /><circle cx="58" cy="60" r="5" /></g>;
    case 6: return <g><path d="M40 39c-19-11-14-25-5-21 2 1 4 3 5 5 4-10 16-6 14 2-2 6-8 11-14 14Z" /><circle cx="25" cy="52" r="5" /><circle cx="55" cy="52" r="5" /><path d="M25 58v20M55 58v20M25 64l15 6 15-6M25 77l-7 9M25 77l7 9M55 77l-7 9M55 77l7 9" /></g>;
    case 7: return <g><path d="M21 34V24h38v10M26 23l14-10 14 10M18 45h44v22H18zM26 35v10M54 35v10M27 53h26M30 79h20" /><circle cx="23" cy="69" r="9" /><circle cx="57" cy="69" r="9" /><path d="M23 65v8M19 69h8M57 65v8M53 69h8" /></g>;
    case 8: return <g><path d="M40 37c-16-9-13-21-5-18 2 0 4 3 5 4 3-8 13-5 12 2-2 5-7 9-12 12Z" /><circle cx="40" cy="61" r="20" /><path d="m27 48 6 5M53 48l-6 5M33 68l7 4 7-4M37 73l3 5 3-5M25 68l-6 4M55 68l6 4" /><circle cx="33" cy="60" r="1" /><circle cx="47" cy="60" r="1" /></g>;
    case 11: return <g><path d="M40 18v58M23 80h34M18 32h44M22 32 12 52h20L22 32ZM58 32 48 52h20L58 32ZM12 52c3 7 17 7 20 0M48 52c3 7 17 7 20 0" /><circle cx="40" cy="30" r="4" /></g>;
    case 12: return <g><path d="M17 20h46M26 20v12M42 21v31l-16-8M26 44l7-12M42 52v20M42 55l-15 10M42 55l14 10" /><circle cx="42" cy="79" r="5" /><circle cx="42" cy="79" r="10" strokeOpacity=".4" /></g>;
    case 13: return <g><path d="M35 25v58M34 25c13-10 27-8 33 7-14-7-25-4-33 2M18 66l13 5M18 77l13-4M56 54v28M48 62l8 5 8-5" /><path d="M56 55c-10-5-10-14-2-12 5-7 12-1 8 6-1 3-4 5-6 6Z" /><path d="M12 84h56" /></g>;
    case 14: return <g><path d="M18 26h20l-3 20H21l-3-20ZM26 46v8M21 55h10M45 57h20l-3 20H48l-3-20ZM53 77v6M49 84h11M35 43c20 3 0 15 17 16" /><path d="M30 18c5-8 12-8 18 0M40 12v-5M53 20l5-4" /></g>;
    case 15: return <g><path d="M24 37c-8-14-3-21 3-25l3 20M56 37c8-14 3-21-3-25l-3 20M23 42l17-10 17 10-6 17H29l-6-17ZM30 48h4M46 48h4M36 56h8" /><path d="M28 69c-9-10-17 0-10 6l9 4c8 3 11-6 1-10ZM51 70c-8-9-18-1-11 6l10 4c8 3 12-6 1-10Z" /></g>;
    case 16: return <g><path d="M24 82h32l-5-45H29l-5 45ZM29 31V20h7v8h8v-8h7v11M34 49h12v9H34zM34 68h12v14M56 10 42 28h11L40 44M18 42l-6 8M62 57l7 9M14 72l4 7" /></g>;
    case 18: return <g><path d="M48 17c-18-3-26 19-13 31 10 9 22 3 27-6-14 5-24-12-14-25Z" fill="currentColor" fillOpacity=".12" /><path d="M12 73 25 55l12 18M43 73l14-18 12 18M8 81c8-4 13 4 21 0s13 4 21 0 13 4 21 0M12 89c8-4 13 4 21 0s13 4 21 0 13 4 17 0" /></g>;
    case 19: return <g><circle cx="40" cy="44" r="20" fill="currentColor" fillOpacity=".1" /><path d="M40 13v8M40 67v8M9 44h8M63 44h8M18 22l6 6M56 60l6 6M18 66l6-6M56 28l6-6M32 45h.1M48 45h.1M33 52c3 5 11 5 14 0M17 83h46" /></g>;
    case 20: return <g><path d="m21 31 25 12-4 9-27-7 6-14ZM46 43l15-6-3 24-16-9M29 47l-5 12 8 3 7-12M24 68l-7 8M41 64v11M57 68l6 8M20 84h40" /><path d="M57 17v12M51 23h12" /></g>;
    case 21: return <g><ellipse cx="40" cy="48" rx="24" ry="34" /><ellipse cx="40" cy="48" rx="19" ry="28" strokeOpacity=".4" /><circle cx="40" cy="33" r="4" /><path d="M40 38v24M40 45l-12-5M40 45l12-5M40 62l-9 9M40 62l9 9M19 21l7 2M54 74l7 2M18 72l7 1M55 23l7 1" /></g>;
    default: return <g><circle cx="40" cy="48" r="25" /><path d="M40 16v7M40 73v7M8 48h7M65 48h7M18 26l5 5M57 65l5 5M18 70l5-5M57 31l5-5" /><text x="40" y="49" className="reflection-card-glyph">{card.symbol}</text></g>;
  }
}

function TarotSymbol({ card }: { card: DrawnTarotCard }) {
  return <svg className="reflection-card-symbol" viewBox="0 0 80 96" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {card.id === 9 ? <><path d="M25 33c-2-11 2-20 10-21 8 2 12 9 10 19l-7 5-13-3Z" fill="currentColor" fillOpacity=".11" /><path d="m28 34-9 45h29l-7-44M29 27c1 6 4 8 8 7M38 40l16-8M29 42l5 29M46 38v45" /><path d="M53 27h12l-2 6h-8l-2-6Zm2 6h8l3 15H52l3-15ZM58 27v-4h3v4" /><path d="m59 36 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="currentColor" fillOpacity=".35" /><path d="M17 84h38M13 86h5M67 36l5-1M49 28l-4-4" /></> : card.id === 17 ? <><path d="m40 10 3 12 10-7-7 10 12 3-12 3 7 10-10-7-3 12-3-12-10 7 7-10-12-3 12-3-7-10 10 7 3-12Z" fill="currentColor" fillOpacity=".17" /><path d="m15 13 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM64 18l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM17 37l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /><circle cx="42" cy="52" r="4" /><path d="m41 57-8 13 13 3 7 10M36 63l-8-5-8 9M42 61l12-4 7 7M20 67l-2 8M61 64l3 8M9 80c7-4 13 4 20 0s13 4 20 0 13 4 21 0M10 87c7-4 13 4 20 0s13 4 20 0 13 4 20 0" /></> : card.id === 10 ? <><circle cx="40" cy="48" r="27" fill="currentColor" fillOpacity=".08" /><circle cx="40" cy="48" r="21" /><circle cx="40" cy="48" r="6" /><path d="M40 21v21M40 54v21M13 48h21M46 48h21M21 29l15 15M44 52l15 15M21 67l15-15M44 44l15-15" /><path d="m14 13 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM65 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM14 77l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM65 77l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /><path d="M36 12h8M36 84h8" /></> : <g data-symbol={card.symbol}><ellipse cx="40" cy="48" rx="34" ry="42" className="tarot-motif-frame" /><TarotMotif card={card} /></g>}
  </svg>;
}

function TarotDeck({ roundId, chosen, disabled, failed, onChoose }: { roundId: string; chosen: CardNumber | null; disabled: boolean; failed: boolean; onChoose: (number: CardNumber) => void }) {
  const drawnCards = useMemo(() => drawTarotCards(roundId) as DrawnTarotCard[], [roundId]);
  const [spreadReady, setSpreadReady] = useState(chosen !== null);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (chosen !== null || motion.matches) { setSpreadReady(true); return; }
    const timer = window.setTimeout(() => setSpreadReady(true), 2000);
    const skipMotion = () => { if (motion.matches) { window.clearTimeout(timer); setSpreadReady(true); } };
    motion.addEventListener("change", skipMotion);
    return () => { window.clearTimeout(timer); motion.removeEventListener("change", skipMotion); };
  }, [roundId, chosen]);
  const selected = chosen ? drawnCards[chosen - 1] : null;
  return <section className="reflection-deck" data-stage={spreadReady ? "spread" : "shuffle"} aria-labelledby={`card-heading-${roundId}`}>
    <div className="reflection-deck-heading"><Sparkles size={15} /><h2 id={`card-heading-${roundId}`}>ไพ่ทาโร่สามใบ หนึ่งมุมมองใหม่</h2></div>
    <p className="reflection-deck-intro">{spreadReady ? "เลือกใบที่รู้สึกดึงดูดใจคุณ ไม่ต้องรีบ" : "สับไพ่จากชุดทาโร่ 22 ใบ แล้วแจกไพ่คว่ำ 3 ใบให้คุณ"}</p>
    {!spreadReady ? <div className="reflection-shuffle"><div className="reflection-shuffle-stack" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(index => <span key={index} className="reflection-shuffle-card" style={{ animationDelay: `${index * 90}ms`, zIndex: 6 - index }}><span className="reflection-card-back"><span className="reflection-corner top">✧</span><span className="reflection-card-orbit" /><span className="reflection-card-diamond" /><Moon size={31} strokeWidth={1.2} className="reflection-card-moon" /><span className="reflection-card-star">✦</span><span className="reflection-corner bottom">✧</span></span></span>)}</div><span className="reflection-shuffle-caption">ค่อย ๆ สับ แล้ววางไพ่ให้คุณเลือก</span></div> : <div className="reflection-card-grid" role="group" aria-label="ไพ่คว่ำสามใบ เลือกได้หนึ่งใบ">
      {drawnCards.map((card, index) => {
        const number = (index + 1) as CardNumber;
        return <button key={card.id} type="button" className={`reflection-pick ${chosen === number ? "is-chosen" : ""} ${chosen && chosen !== number ? "is-unselected" : ""}`} style={{ animationDelay: `${index * 110}ms` }} onClick={() => onChoose(number)} disabled={disabled || chosen !== null} aria-label={`ไพ่ใบที่ ${number}${chosen === number ? " เลือกแล้ว" : ""}`} aria-pressed={chosen === number}>
          <span className="reflection-card-back" aria-hidden="true"><span className="reflection-corner top">✧</span>{chosen === number ? <><span className="reflection-card-numeral">{card.numeral}</span><TarotSymbol card={card} /><span className="reflection-card-name">{card.title}</span><span className="reflection-card-title">{card.name.toUpperCase()}</span><span className="reflection-chosen-mark"><Check size={15} strokeWidth={2.5} /></span></> : <><span className="reflection-card-orbit" /><span className="reflection-card-diamond" /><Moon size={31} strokeWidth={1.2} className="reflection-card-moon" /><span className="reflection-card-star">✦</span></>}<span className="reflection-corner bottom">✧</span></span>
          <span className="reflection-card-label">ไพ่ใบที่ {number}</span><span className="reflection-card-action">{chosen === number ? "เลือกแล้ว" : chosen ? "" : "แตะเพื่อเลือก"}</span>
        </button>;
      })}
    </div>}
    <p className="reflection-selection-status" role="status">{!spreadReady ? "กำลังสับไพ่ทาโร่…" : chosen && selected ? failed ? `คุณเลือกไพ่ใบที่ ${chosen} ไว้แล้ว ส่งไม่สำเร็จ ลองส่งอีกครั้งได้ด้านล่าง` : `คุณเลือกไพ่ใบที่ ${chosen}: ${selected.title} (${selected.name})` : "เลือกได้หนึ่งใบต่อรอบ"}</p>
    <p className="reflection-deck-note"><ShieldCheck size={12} /> ไพ่ทาโร่เป็นสัญลักษณ์เพื่อสะท้อนใจ ไม่รับประกันความแม่นยำในการทำนาย</p>
  </section>;
}
class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await chatFetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(typeof body.error === "string" ? body.error : "เชื่อมต่อไม่สำเร็จ ลองอีกครั้งได้เลย", response.status);
  return body as T;
}
function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? "brand-small" : ""}`}><span className="brand-mark"><Moon size={23} strokeWidth={1.6} /><Star className="brand-star" size={9} fill="currentColor" /></span><span><strong>ม่านใจ<span className="brand-dot">.</span></strong><small>MOONMIND</small></span></span>;
}
function ModeBadge({ mode, localMode = false }: { mode: Session["mode"]; localMode?: boolean }) {
  return <span className={`mode-badge ${localMode ? "local" : mode}`}><span />{localMode ? "ในเครื่อง · ระบบกติกา" : mode === "demo" ? "โหมดทดลอง · คำตอบจากกติกา" : "AI สะท้อนใจ"}</span>;
}
function LocalRuntimeNote() {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  return <div className="local-runtime-note"><span>ใช้งานในเครื่อง · ตอบด้วยระบบกติกา</span>{origin && <code>{origin}</code>}</div>;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentAdmin, setConsentAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const sendInFlight = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [retry, setRetry] = useState<{ content: string; requestId: string } | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [menuOpen, setMenuOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [users, setUsers] = useState<HistoryUser[]>([]);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<HistoryUser | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [accountDeleteStatus, setAccountDeleteStatus] = useState("");
  const [cardSelections, setCardSelections] = useState<Record<string, CardSelection>>({});
  const cardSelectionLocks = useRef(new Map<string, CardSelection>());
  const bottom = useRef<HTMLDivElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cardRoundIndex = messages.findLastIndex(message => message.role === "assistant" && message.content.includes(CARD_INVITATION));
  const cardRound = cardRoundIndex >= 0 ? messages[cardRoundIndex] : null;
  const savedChoice = cardRound ? messages.slice(cardRoundIndex + 1).find(message => message.role === "user" && CARD_SELECTION.test(message.content.trim())) : null;
  const savedCardNumber = savedChoice ? Number(savedChoice.content.trim().match(CARD_SELECTION)?.[1]) as CardNumber : null;
  const chosenCard = savedCardNumber ?? (cardRound ? cardSelections[cardRound.id]?.number ?? null : null);
  const selectedTarotCard = cardRound && savedCardNumber ? (drawTarotCards(cardRound.id) as DrawnTarotCard[])[savedCardNumber - 1] : null;
  const suggestions = useMemo(() => conversationSuggestions(messages), [messages]);
  // After a reading insight the user picks how to hear on: cups (comfort) or swords (hard truth).
  const lastMessage = messages.at(-1);
  const modeChoice = lastMessage?.role === "assistant" ? modeChoiceFor(lastMessage.content) : null;

  function useSuggestion(content: string) {
    if (busy || retry || draft.trim()) return;
    setDraft(content);
    window.requestAnimationFrame(() => composer.current?.focus());
  }

  const restore = useCallback(async () => {
    setBooting(true); setError("");
    try {
      const data = await api<Session>("/api/session"); setSession(data);
      if (data.user) {
        const history = await api<{ messages: Message[]; mode: Session["mode"] }>("/api/messages");
        setMessages(history.messages); setSession({ ...data, mode: history.mode });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดประวัติไม่สำเร็จ");
    } finally { setBooting(false); }
  }, []);
  useEffect(() => { void restore(); }, [restore]);
  useEffect(() => {
    if (session?.authenticated) return;
    const returnToLanding = () => {
      setSession(null); setMessages([]); setDraft(""); setRetry(null);
      setName(""); setConsent(false); setConsentAdmin(false); setModal(false);
      window.location.replace(homeUrl);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOGOUT_EVENT && event.newValue) returnToLanding();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) returnToLanding();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("pageshow", onPageShow); };
  }, [session?.authenticated]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    if (modal || privacyOpen) (nameInput.current ?? modalRef.current?.querySelector<HTMLElement>("button, a[href]"))?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { if (!busy) setModal(false); setPrivacyOpen(false); setMenuOpen(false); }
      if (event.key === "Tab" && (modal || privacyOpen) && modalRef.current) {
        const controls = modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href]');
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey); return () => document.removeEventListener("keydown", handleKey);
  }, [modal, privacyOpen, busy]);

  async function send(payload: { content: string; requestId: string }) {
    if (sendInFlight.current) return;
    const selectionMatch = payload.content.trim().match(CARD_SELECTION);
    if (cardRound && selectionMatch) {
      const number = Number(selectionMatch[1]) as CardNumber;
      const locked = cardSelectionLocks.current.get(cardRound.id);
      const sameRequest = locked?.number === number && locked.requestId === payload.requestId;
      if ((savedCardNumber !== null || locked) && !sameRequest) {
        setError("รอบนี้เลือกไพ่ไว้แล้ว หากข้อความส่งไม่สำเร็จ ให้ใช้ปุ่มลองส่งอีกครั้งของข้อความเดิม");
        return;
      }
      if (!locked) {
        const selection = { number, requestId: payload.requestId };
        cardSelectionLocks.current.set(cardRound.id, selection);
        setCardSelections(previous => ({ ...previous, [cardRound.id]: selection }));
      }
    }
    sendInFlight.current = true;
    setBusy(true); setSending(true); setError(""); setRetry(null);
    const pendingId = `pending_${payload.requestId}`;
    setMessages(previous => previous.some(message => message.id === pendingId) ? previous : [...previous, { id: pendingId, role: "user", content: payload.content, createdAt: Date.now() }]);
    try {
      const result = await api<{ messages: Message[]; mode: Session["mode"] }>("/api/messages", { method: "POST", body: JSON.stringify(payload) });
      setMessages(previous => { const saved = previous.filter(message => message.id !== pendingId); const known = new Set(saved.map(message => message.id)); return [...saved, ...result.messages.filter(message => !known.has(message.id))]; });
      setSession(previous => previous ? { ...previous, mode: result.mode } : previous);
    } catch (err) { setMessages(previous => previous.filter(message => message.id !== pendingId)); setError(err instanceof Error ? err.message : "ส่งข้อความไม่สำเร็จ"); setRetry(payload); }
    finally { sendInFlight.current = false; setBusy(false); setSending(false); window.requestAnimationFrame(() => composer.current?.focus()); }
  }
  function chooseCard(number: CardNumber) {
    if (!cardRound || busy || booting || retry || chosenCard || cardSelectionLocks.current.has(cardRound.id)) return;
    const selection = { number, requestId: crypto.randomUUID() };
    // Lock synchronously before React renders, so rapid clicks send only one choice.
    cardSelectionLocks.current.set(cardRound.id, selection);
    setCardSelections(previous => ({ ...previous, [cardRound.id]: selection }));
    void send({ content: `เราเลือกไพ่ใบที่ ${number}`, requestId: selection.requestId });
  }
  async function start(event: React.FormEvent) {
    event.preventDefault(); if (busy || !consent) return;
    setBusy(true); setError("");
    try {
      const result = await api<Session>("/api/session", { method: "POST", body: JSON.stringify({ name: name.trim(), consent: true, consentAdmin }) });
      const history = await api<{ messages: Message[]; mode: Session["mode"] }>("/api/messages");
      setMessages(history.messages); setSession({ ...result, mode: history.mode }); setModal(false);
    } catch (err) { setError(err instanceof Error ? err.message : "เริ่มต้นไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  function submit(event: React.FormEvent) {
    event.preventDefault(); const content = draft.trim(); if (!content || busy || retry) return;
    setDraft(""); void send({ content, requestId: crypto.randomUUID() });
  }
  async function logout() {
    if (busy || loggingOut || session?.authenticated) return;
    setLoggingOut(true); setBusy(true); setError("");
    try {
      await api<{ loggedOut: boolean }>("/api/session", { method: "DELETE" });
      setSession(null); setMessages([]); setDraft(""); setRetry(null);
      setName(""); setConsent(false); setConsentAdmin(false); setModal(false);
      setCardSelections({}); cardSelectionLocks.current.clear();
      // Signal other guest tabs without storing names or conversation content.
      try { localStorage.setItem(LOGOUT_EVENT, crypto.randomUUID()); } catch { /* Server-side chat access is still suspended when browser storage is blocked. */ }
      window.location.replace(homeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ออกจากระบบไม่สำเร็จ ลองอีกครั้งได้เลย");
      setLoggingOut(false); setBusy(false); setMenuOpen(false);
    }
  }
  async function loadUsers() {
    setAccountDeleteStatus("");
    setView("history"); setMenuOpen(false); setHistoryLoading(true); setHistoryError(""); setSelectedUser(null); setHistoryMessages([]);
    try { const result = await api<{ users: HistoryUser[] }>("/api/admin/users"); setUsers(result.users); }
    catch (err) { setHistoryError(err instanceof Error ? err.message : "โหลดรายชื่อไม่สำเร็จ"); }
    finally { setHistoryLoading(false); }
  }
  async function loadHistory(user: HistoryUser) {
    setSelectedUser(user); setHistoryMessages([]); setHistoryLoading(true); setHistoryError("");
    try { const result = await api<{ messages: Message[]; name: string }>(`/api/admin/messages?userId=${encodeURIComponent(user.id)}`); setHistoryMessages(result.messages); }
    catch (err) { setHistoryError(err instanceof Error ? err.message : "โหลดประวัติไม่สำเร็จ"); }
    finally { setHistoryLoading(false); }
  }
  function accountDeleted(id: string, name: string) {
    setUsers(previous => previous.filter(user => user.id !== id));
    setSelectedUser(null); setHistoryMessages([]); setHistoryLoading(false); setHistoryError("");
    setAccountDeleteStatus(`ลบบัญชี ${name} และประวัติทั้งหมดแล้ว`);
  }
  async function updateConsent() {
    if (!session?.user) return; setBusy(true); setError("");
    try {
      await api("/api/session", { method: "PATCH", body: JSON.stringify({ consentAdmin: !session.user.consentAdmin }) });
      setSession({ ...session, user: { ...session.user, consentAdmin: !session.user.consentAdmin } });
    } catch (err) { setError(err instanceof Error ? err.message : "เปลี่ยนการยินยอมไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  async function deleteMessages() {
    setBusy(true); setError("");
    try { await api("/api/messages", { method: "DELETE", body: "{}" }); setMessages([]); setDeleteConfirm(false); setPrivacyOpen(false); setRetry(null); setCardSelections({}); cardSelectionLocks.current.clear(); }
    catch (err) { setError(err instanceof Error ? err.message : "ลบประวัติไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  if (session?.user) return <main className="chat-app">
    {menuOpen && <button className="sidebar-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} />}
    <aside className={`chat-sidebar ${menuOpen ? "is-open" : ""}`}>
      <a className="brand-link" href={homeUrl} aria-label="ม่านใจ หน้าแรก"><Brand small /></a>
      <p className="sidebar-eyebrow">พื้นที่ของคุณ</p>
      <button className={`sidebar-item ${view === "chat" ? "active" : ""}`} onClick={() => { setView("chat"); setMenuOpen(false); }}><MessageCircle size={18} /> แชทดูดวง <Sparkles size={14} /></button>
      {session.isAdmin && <button className={`sidebar-item ${view === "history" ? "active" : ""}`} onClick={() => void loadUsers()}><History size={18} /> ประวัติผู้ใช้</button>}
      <div className="sidebar-quote"><Moon size={22} /><p>ไม่ต้องมีคำตอบ<br />ให้ทุกเรื่องในคืนนี้</p><span>ค่อย ๆ ฟังเสียงข้างในไปด้วยกัน</span></div>
      <div className="sidebar-bottom"><button className="sidebar-item" onClick={() => setPrivacyOpen(true)}><ShieldCheck size={18} /> ข้อมูลและความเป็นส่วนตัว</button>{!session.authenticated && <><button className="sidebar-item guest-logout" onClick={() => void logout()} disabled={busy || loggingOut}>{loggingOut ? <LoaderCircle size={18} className="spin" /> : <LogOut size={18} />} {loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</button><p className="logout-note">ออกแล้วใส่ชื่อเดิมเพื่อคุยต่อได้บนเบราว์เซอร์นี้</p></>}<div className="user-profile"><span className="avatar">{session.user.name.slice(0, 1)}</span><span><strong>{session.user.name}</strong><small>{session.isAdmin ? session.localMode ? "ผู้ดูแลในเครื่อง" : "ผู้ดูแลระบบ" : "พื้นที่ส่วนตัวของคุณ"}</small></span>{session.authenticated && <a href="/signout-with-chatgpt?return_to=/" target="_top" title="ออกจากระบบ" aria-label="ออกจากระบบ"><LogOut size={17} /></a>}</div></div>
    </aside>
    <section className="chat-main">
      <header className="chat-header"><div className="chat-title"><button className="icon-button mobile-menu" aria-label="เปิดเมนู" onClick={() => setMenuOpen(true)}><Menu size={22} /></button><span><strong>{view === "chat" ? "แชทดูดวง" : "ประวัติการสนทนา"}</strong><small>{view === "chat" ? "พื้นที่เล็ก ๆ ที่คุณเป็นตัวเองได้" : "เฉพาะผู้ใช้ที่ยินยอมให้ผู้ดูแลตรวจดู"}</small></span></div><ModeBadge mode={session.mode} localMode={session.localMode} /></header>
      {view === "chat" ? <>
        {session.localMode ? <LocalRuntimeNote /> : session.mode === "demo" && <div className="demo-notice"><CircleHelp size={15} /><span>ขณะนี้ตอบด้วยกติกาสำหรับทดลองใช้งาน ต้องเชื่อมต่อบริการ AI จึงจะวิเคราะห์บทสนทนาด้วย AI ได้</span></div>}
        <div className="chat-scroll">
          <div className="conversation">{booting && <div className="history-empty" role="status"><LoaderCircle className="spin" size={24} /> กำลังเปิดพื้นที่ของคุณ</div>}
            {!messages.length && !busy && !booting && <div className="chat-empty"><div className="empty-orb"><Moon size={32} strokeWidth={1.3} /></div><span className="eyebrow">A LITTLE SPACE FOR YOUR HEART</span><h1>วันนี้ใจคุณเป็นอย่างไรบ้าง<br />{session.user.name}?</h1><p>เล่าเท่าที่อยากเล่า ม่านใจจะช่วยสะท้อนความรู้สึก<br />และชวนมองเรื่องเดิมในมุมที่อ่อนโยนขึ้น</p><div className="suggestion-grid">{["ช่วงนี้ฉันคิดมากเรื่องอนาคต", "อยากเข้าใจความรู้สึกตัวเอง", "มีเรื่องความสัมพันธ์อยากเล่า"].map(text => <button key={text} onClick={() => void send({ content: text, requestId: crypto.randomUUID() })} disabled={busy || !!retry}>{text}<ArrowUp size={16} /></button>)}</div></div>}
            {messages.map(message => <div className={`message ${message.role}`} key={message.id}>{message.role === "assistant" && <span className="message-avatar"><Moon size={18} /></span>}<div className="message-body">{message.role === "assistant" && <span className="message-label">ม่านใจ <Sparkles size={11} /></span>}<div className="message-text">{message.content}</div>{cardRound?.id === message.id && <TarotDeck key={cardRound.id} roundId={cardRound.id} chosen={chosenCard} disabled={busy || booting || !!retry} failed={!!retry && CARD_SELECTION.test(retry.content)} onChoose={chooseCard} />}</div></div>)}
            {sending && <div className="message assistant"><span className="message-avatar"><Moon size={18} /></span><div className="message-body"><span className="message-label">กำลังเตรียมคำตอบ</span><div className="typing" role="status" aria-label="กำลังเตรียมคำตอบ"><span /><span /><span /></div></div></div>}
            {error && <div className="error-box" role="alert"><p>{error}</p>{retry ? <><p className="failed-message">ข้อความ: {retry.content}</p><button className="text-button" onClick={() => void send(retry)} disabled={busy}>ลองส่งอีกครั้ง <ArrowRight size={14} /></button>{!CARD_SELECTION.test(retry.content.trim()) && <button className="text-button" onClick={() => { setDraft(retry.content); setRetry(null); setError(""); }}>นำกลับไปแก้ไข</button>}</> : <button className="text-button" onClick={() => void restore()}>ลองโหลดอีกครั้ง</button>}</div>}
            <div ref={bottom} />
          </div>
        </div>
        <div className="composer-area">
          {selectedTarotCard && <p className="conversation-card-context"><Sparkles size={12} aria-hidden="true" /> ไพ่ที่เลือกไว้: {selectedTarotCard.title}</p>}
          {modeChoice && !busy && !retry && <div className="reading-mode-choice" role="group" aria-label="เลือกวิธีฟังคำทำนายต่อ">
            <button type="button" className={`reading-mode-button ${modeChoice.recommended === "cups" ? "is-recommended" : ""}`} onClick={() => void send({ content: MODE_REQUEST.cups, requestId: crypto.randomUUID() })}><Heart size={18} aria-hidden="true" /><span><strong>ไพ่ถ้วย</strong><small>กำลังใจและการปลอบ{modeChoice.recommended === "cups" ? " · แนะนำ" : ""}</small></span></button>
            {modeChoice.swords && <button type="button" className={`reading-mode-button swords ${modeChoice.recommended === "swords" ? "is-recommended" : ""}`} onClick={() => void send({ content: MODE_REQUEST.swords, requestId: crypto.randomUUID() })}><Swords size={18} aria-hidden="true" /><span><strong>ไพ่ดาบ</strong><small>ความจริงตรง ๆ ที่อาจแสบ{modeChoice.recommended === "swords" ? " · แนะนำ" : ""}</small></span></button>}
          </div>}
          {!busy && !retry && !draft.trim() && suggestions.length > 0 && <div className="conversation-navigation" role="group" aria-label="เลือกแนวทางคุยต่อ เติมข้อความแล้วกดส่งได้">
            {suggestions.map(suggestion => <button key={suggestion.id} type="button" onClick={() => useSuggestion(suggestion.content)} aria-label={`${suggestion.label} — เติมในช่องข้อความ`}>{suggestion.label}</button>)}
          </div>}
          <form className="composer" onSubmit={submit}><textarea ref={composer} aria-label="ข้อความถึงม่านใจ" placeholder="มีอะไรอยู่ในใจ เล่าให้ม่านใจฟังได้เลย…" value={draft} maxLength={4000} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(event); } }} rows={2} disabled={busy} /><div className="composer-footer"><span><ShieldCheck size={13} /> คุณเลือกได้ว่าจะเล่าแค่ไหน</span><button className="send-button" type="submit" disabled={!draft.trim() || busy || !!retry} aria-label="ส่งข้อความ">{busy ? <LoaderCircle size={19} className="spin" /> : <ArrowUp size={20} />}</button></div></form><p className="chat-disclaimer">{session.localMode ? "คำตอบอาจคลาดเคลื่อน" : session.mode === "ai" ? "AI อาจเข้าใจคลาดเคลื่อน" : "คำตอบทดลองอาจไม่ตรงกับคุณ"} · ใช้เพื่อสะท้อนใจ ไม่ใช่การอ่านใจหรือการวินิจฉัย</p></div>
      </> : <div className="admin-area"><div className="admin-heading"><span className="eyebrow">CONVERSATION LIBRARY</span><h1>เรื่องราวที่ได้รับความไว้วางใจ</h1><p>ประวัติที่ผู้ใช้อนุญาตให้ผู้ดูแลตรวจดูเพื่อดูแลคุณภาพบริการ</p></div>{accountDeleteStatus && <p className="account-delete-status" role="status">{accountDeleteStatus}</p>}<div className="admin-grid"><div className="history-users"><div className="history-list-title"><strong>ผู้ใช้งาน ({users.length})</strong><button className="text-button" onClick={() => void loadUsers()} disabled={historyLoading}>รีเฟรช</button></div>{!users.length && !historyLoading && <p className="muted">ยังไม่มีประวัติที่ได้รับอนุญาต</p>}{users.map(user => <button key={user.id} className={`history-user ${selectedUser?.id === user.id ? "selected" : ""}`} onClick={() => void loadHistory(user)} disabled={historyLoading}><span className="avatar">{user.name.slice(0, 1)}</span><span><strong>{user.name}</strong><small>{user.messageCount} ข้อความ · {new Date(user.updatedAt).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}</small></span><ChevronRight size={16} /></button>)}</div><div className="history-content">{historyLoading ? <div className="history-empty" role="status"><LoaderCircle className="spin" size={25} /> กำลังโหลดประวัติ</div> : historyError ? <div className="error-box" role="alert"><p>{historyError}</p><button className="text-button" onClick={() => selectedUser ? void loadHistory(selectedUser) : void loadUsers()}>ลองอีกครั้ง</button></div> : selectedUser ? <><div className="history-detail-heading"><h2>บทสนทนาของ {selectedUser.name}</h2><DeleteUserButton user={selectedUser} disabled={historyLoading} onDeleted={accountDeleted} /></div><p className="history-account-id account-id">ID: {selectedUser.id}</p>{!historyMessages.length && <p className="muted">ยังไม่มีข้อความ</p>}{historyMessages.map(message => <div className={`message ${message.role}`} key={message.id}><div className="message-body"><span className="message-label">{message.role === "user" ? selectedUser.name : "ม่านใจ"}</span><div className="message-text">{message.content}</div></div></div>)}</> : <div className="history-empty"><History size={32} /><h2>เลือกเรื่องราวทางซ้าย</h2><p>เพื่ออ่านบทสนทนาที่ผู้ใช้ยินยอมแชร์</p></div>}</div></div></div>}
    </section>
    {privacyOpen && <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) setPrivacyOpen(false); }}><section className="onboarding privacy-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="privacy-title"><button className="modal-close icon-button" aria-label="ปิด" onClick={() => setPrivacyOpen(false)} disabled={busy}><X size={20} /></button><ShieldCheck className="modal-symbol" size={30} /><h2 id="privacy-title">เรื่องของคุณ คุณเลือกได้</h2><p>ชื่อใช้แสดงในแชท ออกจากระบบแล้วใส่ชื่อเล่นเดิมบนเบราว์เซอร์นี้เพื่อคุยต่อได้ ชื่ออื่นมีประวัติแยกกัน หากล้างคุกกี้หรือเปลี่ยนเครื่อง จะไม่สามารถเปิดประวัติเดิมด้วยชื่อเล่นได้ ผู้ดูแลเข้าถึงเฉพาะเมื่อคุณยินยอมแยกต่างหาก</p><p>ใช้สิ่งที่คุณเคยเล่าและแก้ไขในประวัติ เพื่อจำความชอบและปรับคำตอบสำหรับคุณ การลบประวัติจะล้างความจำจากบทสนทนาด้วย</p>{session.mode === "ai" && <p>เมื่อใช้โหมด AI ข้อความของคุณจะถูกส่งไปยังบริการ AI เพื่อสร้างคำตอบ</p>}<div className="privacy-setting"><strong>อนุญาตให้ผู้ดูแลตรวจบทสนทนา</strong><p>เลือกแยกจากการบันทึกประวัติ ถอนความยินยอมได้ทุกเมื่อ</p><button className={`consent-toggle ${session.user.consentAdmin ? "enabled" : ""}`} disabled={busy} onClick={() => void updateConsent()}>{session.user.consentAdmin ? <Check size={15} /> : <ShieldCheck size={15} />}{session.user.consentAdmin ? "อนุญาตอยู่ · กดเพื่อถอน" : "ไม่ได้อนุญาต · กดเพื่ออนุญาต"}</button></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="delete-section">{deleteConfirm ? <><p>ลบข้อความทั้งหมดและความจำจากบทสนทนาของคุณถาวรใช่ไหม? จะกู้คืนไม่ได้</p><div className="button-row"><button className="button button-danger" disabled={busy} onClick={() => void deleteMessages()}>ยืนยันลบประวัติ</button><button className="button button-secondary" disabled={busy} onClick={() => setDeleteConfirm(false)}>ยกเลิก</button></div></> : <button className="text-button danger" onClick={() => setDeleteConfirm(true)}><Trash2 size={16} /> ลบประวัติการสนทนาทั้งหมด</button>}</div></section></div>}
  </main>;

  return <main className="landing">
    <header className="landing-header"><a className="brand-link" href="#" aria-label="ม่านใจ หน้าแรก"><Brand /></a><nav aria-label="เมนูหลัก"><a href="#our-space">รู้จักม่านใจ</a><a href={adminUrl}>{session?.localMode ? "ผู้ดูแลในเครื่อง" : "ผู้ดูแลเว็บ"}</a><button onClick={() => { setError(""); setModal(true); }}>พื้นที่ของคุณ <ArrowUp size={14} /></button></nav></header>
    {session?.localMode && <div className="landing-runtime-note"><LocalRuntimeNote /></div>}<section className="hero">
      <div className="hero-copy"><div className="hero-kicker"><span className="tiny-star">✦</span> A LITTLE MAGIC. A LITTLE SELF-DISCOVERY.</div><h1>ดูดวงเรื่องใจ<br /><span>ให้เข้าใจตัวเอง</span><i className="headline-star">✧</i></h1><p className="hero-description">บางครั้งสิ่งที่เรามองหา ไม่ใช่คำทำนายอนาคต<br className="desktop-break" /> แต่คือใครสักคนที่ช่วยให้เราได้ยินเสียงในใจชัดขึ้น</p><div className="hero-actions"><button className="button button-primary hero-cta" disabled={booting} onClick={() => { setError(""); setModal(true); }}>{booting ? <LoaderCircle size={19} className="spin" /> : <Sparkles size={18} />} เริ่มดูดวง สำรวจใจ <ArrowRight size={19} /></button><a className="explore-link" href="#our-space">รู้จักพื้นที่นี้ <ArrowDown size={16} /></a></div><div className="hero-assurance"><span><ShieldCheck size={14} /> คุณเลือกได้ว่าจะเล่าแค่ไหน</span><span className="assurance-dot">·</span><span>ไม่มีคำตอบที่ผิด</span></div></div>
      <div className="cosmic-art" aria-hidden="true"><div className="art-glow" /><div className="orbit orbit-outer" /><div className="orbit orbit-inner" /><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><span className="art-star star-three">✦</span><span className="art-star star-four">✧</span><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><div className="tarot-card card-back"><span className="card-corner">✧</span><div className="card-back-symbol">☾</div><span className="card-bottom-star">✧</span></div><div className="tarot-card card-front"><div className="card-topline"><span>XVIII</span><span>✦</span></div><div className="card-arch"><div className="moon-disc" /><span className="inside-star inside-one">✦</span><span className="inside-star inside-two">✧</span><div className="moon-horizon"><span /><span /><span /></div><div className="moon-water" /><span className="arch-dot" /></div><span className="card-moon-title">THE MOON</span><span className="card-moon-subtitle">ฟังเสียงข้างใน</span><div className="card-endline"><span /><Star size={11} fill="currentColor" /><span /></div></div><div className="art-label label-one"><span className="label-sparkle">✧</span><div><small>YOUR FEELINGS MATTER</small><span>ทุกความรู้สึกมีความหมาย</span></div></div><div className="art-label label-two"><Moon size={16} /><span>ค่อย ๆ รู้จักตัวเอง</span></div><span className="art-caption">THE ANSWER IS ALREADY WITHIN YOU</span></div>
    </section>
    <div className="mood-strip"><span>ไม่ต้องเก่งตลอดเวลาก็ได้</span><span className="strip-star">✧</span><span>เริ่มต้นจากการฟังใจตัวเอง</span><span className="strip-star">✧</span><span>ทุกความรู้สึกมีพื้นที่ที่นี่</span><span className="strip-star">✧</span><span>คำตอบใหม่ อาจอยู่ในมุมมองเดิม</span></div>
    <section className="our-space" id="our-space"><div className="section-intro"><span className="eyebrow">NOT YOUR ORDINARY HOROSCOPE</span><h2>ความมหัศจรรย์เล็ก ๆ<br />ที่เริ่มจาก<span>การเข้าใจใจ</span></h2><p>ม่านใจใช้บรรยากาศการดูดวงเป็นจุดเริ่มต้นของบทสนทนา<br />เพื่อช่วยคุณทบทวนความรู้สึกและค้นหามุมมองใหม่</p></div><div className="feature-grid"><article className="feature-card"><span className="feature-number">01 /</span><span className="feature-icon"><Star size={25} strokeWidth={1.4} /></span><h3>เริ่มจากเรื่องในใจ</h3><p>ใส่ชื่อเล่นแล้วเริ่มคุยได้เลย ไม่ต้องเตรียมคำถามที่สมบูรณ์แบบ</p></article><article className="feature-card"><span className="feature-number">02 /</span><span className="feature-icon"><Heart size={25} strokeWidth={1.4} /></span><h3>เล่าเรื่องที่อยู่ในใจ</h3><p>ค่อย ๆ สำรวจความรู้สึกผ่านคำถามที่อ่อนโยน คุณข้ามคำถามหรือหยุดพักได้เสมอ</p></article><article className="feature-card"><span className="feature-number">03 /</span><span className="feature-icon"><Sparkles size={25} strokeWidth={1.4} /></span><h3>มองเห็นทางของตัวเอง</h3><p>ได้คำชวนคิดและแนวทางที่คุณเลือกปรับใช้ โดยคุณเป็นคนตัดสินใจเรื่องชีวิตของตัวเอง</p></article></div><div className="honesty-note"><span className="honesty-icon"><Moon size={23} strokeWidth={1.5} /></span><div><strong>มีบรรยากาศดูดวง มีความจริงใจอยู่ข้างใน</strong><p>{session?.localMode ? "ม่านใจเวอร์ชันในเครื่องใช้ระบบกติกาเพื่อช่วยสะท้อนใจ" : (session?.mode ?? "demo") === "ai" ? "ม่านใจเป็น AI สำหรับสะท้อนใจ" : "ขณะนี้ม่านใจอยู่ในโหมดทดลอง คำตอบมาจากกติกาเพื่อสะท้อนใจ"} ไม่อ่านใจจริง ไม่ทำนายอนาคต และไม่ใช่การวินิจฉัยหรือบริการบำบัดทางจิตวิทยา คำตอบอาจคลาดเคลื่อน คุณบอกเราได้หากมุมมองนั้นไม่ตรงกับคุณ</p>{!session?.localMode && (session?.mode ?? "demo") === "demo" && <p className="demo-copy">เวอร์ชันนี้เป็นโหมดทดลอง ตอบด้วยกติกา ต้องเชื่อมต่อบริการ AI เพื่อใช้งาน AI จริง</p>}</div><span className="honesty-decoration" aria-hidden="true">✧</span></div></section>
    <footer className="landing-footer"><Brand small /><p>ให้ความเข้าใจ เป็นดาวนำทางของคุณ</p><span><a href={adminUrl}>{session?.localMode ? "สำหรับผู้ดูแลในเครื่อง" : "สำหรับผู้ดูแลเว็บ"}</a> · © 2026 MOONMIND</span></footer>
    {error && !modal && <div className="landing-error" role="alert"><span>{error}</span><button className="text-button" onClick={() => void restore()}>ลองอีกครั้ง</button><button className="icon-button" aria-label="ปิดข้อความ" onClick={() => setError("")}><X size={16} /></button></div>}
    {modal && <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) setModal(false); }}><section className="onboarding" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><button className="modal-close icon-button" onClick={() => setModal(false)} disabled={busy} aria-label="ปิดหน้าต่าง"><X size={20} /></button><span className="modal-symbol"><Sparkles size={29} strokeWidth={1.4} /></span><span className="eyebrow">YOUR STORY BEGINS HERE</span><h2 id="onboarding-title">ก่อนเปิดประตูสู่ใจ</h2><p>มาทำความรู้จักกันสักนิด<br />พื้นที่นี้ไม่ต้องมีคำตอบที่สมบูรณ์แบบ</p>{<form onSubmit={start}><label className="field-label" htmlFor="user-name">ให้เราเรียกคุณว่าอะไรดี</label><input ref={nameInput} id="user-name" className="text-input" value={name} onChange={event => setName(event.target.value)} placeholder="ชื่อเล่นของคุณ" maxLength={60} required autoComplete="nickname" disabled={busy} /><label className="checkbox-label"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required disabled={busy} /><span>ยินยอมให้บันทึกบทสนทนา เพื่อจำบริบทและปรับคำตอบสำหรับคุณ <small>ใส่ชื่อเดิมบนเบราว์เซอร์เดิมเพื่อคุยต่อ ชื่อใหม่เริ่มอีกประวัติ ลบประวัติได้ในเมนูความเป็นส่วนตัว</small></span></label><label className="checkbox-label"><input type="checkbox" checked={consentAdmin} onChange={event => setConsentAdmin(event.target.checked)} disabled={busy} /><span>อนุญาตให้ผู้ดูแลตรวจบทสนทนาเพื่อดูแลคุณภาพ <small>ไม่จำเป็นต้องเลือก และถอนความยินยอมได้ทุกเมื่อ</small></span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary modal-submit" type="submit" disabled={busy || !consent || !name.trim()}>{busy ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />} {busy ? "กำลังเตรียมพื้นที่ให้คุณ" : "เริ่มสำรวจใจไปด้วยกัน"}<ArrowRight size={18} /></button></form>}<p className="modal-footnote">{session?.localMode ? "ใช้งานในเครื่อง · คำตอบจากระบบกติกา" : (session?.mode ?? "demo") === "ai" ? "เป็นการสะท้อนใจด้วย AI" : "โหมดทดลอง · คำตอบจากกติกา ต้องเชื่อมต่อบริการเพื่อใช้ AI จริง"}<br />ไม่ใช่การอ่านใจหรือการวินิจฉัย</p></section></div>}
  </main>;
}
