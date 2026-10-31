'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, History, KeyRound, LoaderCircle, LogOut, MessageCircle, Moon, ShieldCheck } from 'lucide-react';

type Status = { configured: boolean; model: string; updatedAt: number | null; ready: boolean };
type Session = { localMode?: boolean; authenticated: boolean; isAdmin: boolean };
export default function AISettings() {
  const [state, setState] = useState<'loading' | 'ready' | 'login' | 'denied' | 'error'>('loading');
  const [localMode, setLocalMode] = useState(false);
  const [localOrigin, setLocalOrigin] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-5.6-terra');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setState('loading'); setError('');
    try {
      const sessionResponse = await fetch('/api/session', { cache: 'no-store' });
      if (sessionResponse.status === 401) { setState('login'); return; }
      if (!sessionResponse.ok) throw new Error('ตรวจสอบโหมดการใช้งานไม่สำเร็จ');
      const session = await sessionResponse.json() as Session;
      setLocalMode(session.localMode === true);
      if (session.localMode) {
        setApiKey(''); setStatus(null);
        if (!session.authenticated) { setState('login'); return; }
        if (!session.isAdmin) { setState('denied'); return; }
        setState('ready'); return;
      }
      const response = await fetch('/api/admin/ai-settings', { cache: 'no-store' });
      if (response.status === 401) { setState('login'); return; }
      if (response.status === 403) { setState('denied'); return; }
      const data = await response.json() as Status & { error?: string };
      if (!response.ok) throw new Error(data.error || 'โหลดการตั้งค่าไม่สำเร็จ');
      setStatus(data); if (data.model) setModel(data.model); setState('ready');
    } catch { setError('โหลดการตั้งค่าไม่สำเร็จ กรุณาลองอีกครั้ง'); setState('error'); }
  }
  useEffect(() => { setLocalOrigin(window.location.origin); void load(); }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || localMode) return;
    setBusy(true); setError(''); setSuccess('');
    const payload = { apiKey: apiKey.trim(), model: model.trim() };
    setApiKey('');
    try {
      const response = await fetch('/api/admin/ai-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json() as Status & { error?: string };
      if (response.status === 401) { setState('login'); return; }
      if (response.status === 403) { setState('denied'); return; }
      if (!response.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setStatus({ ...data, ready: true });
      setSuccess('เชื่อมต่อสำเร็จ แชทพร้อมใช้ AI จริงแล้ว');
    } catch (err) { setError(err instanceof Error ? err.message : 'การเชื่อมต่อขัดข้อง กรุณาลองใหม่'); }
    finally { setBusy(false); }
  }
  return <main className="owner-dashboard">
    <header className="owner-header"><a href="/" className="owner-brand"><Moon size={25} /><strong>ม่านใจ<span>.</span></strong><span className="owner-tag"><ShieldCheck size={13} /> {localMode ? "ผู้ดูแลในเครื่อง" : "ผู้ดูแลเว็บ"}</span></a><a className="text-button" href="/admin">กลับหน้าผู้ดูแล <ArrowLeft size={15} /></a></header>
    <div className="owner-layout"><aside className="owner-navigation"><span className="sidebar-eyebrow">จัดการเว็บของคุณ</span><a className="sidebar-item" href="/"><MessageCircle size={18} /> แชทดูดวง</a><a className="sidebar-item" href="/admin"><History size={18} /> ประวัติผู้ใช้</a><a className="sidebar-item active" href="/admin/settings" aria-current="page"><KeyRound size={18} /> {localMode ? "การใช้งานในเครื่อง" : "ตั้งค่า AI"}</a><p>{localMode ? "ใช้ระบบสนทนาและประวัติบนคอมพิวเตอร์นี้" : "เชื่อม AI สำหรับแชทของม่านใจด้วยบัญชี OpenAI ของคุณ"}</p><a className="sidebar-item owner-signout" href="/signout-with-chatgpt?return_to=/admin/settings" target="_top"><LogOut size={17} /> ออกจากระบบ</a></aside>
    <section className="owner-content"><div className="admin-heading"><span className="eyebrow">{localMode ? "LOCAL OWNER · RUNTIME" : "ADMIN · AI CONNECTION"}</span><h1>{localMode ? "การใช้งานในเครื่อง" : "ตั้งค่า AI"}</h1><p>{localMode ? "ระบบสนทนาที่เปิดใช้บนคอมพิวเตอร์ของคุณ" : "ใส่คีย์ของคุณเพื่อให้ม่านใจตอบจากบทสนทนาได้อย่างเป็นธรรมชาติ"}</p></div>
      {state === 'loading' ? <div className="owner-status" role="status"><LoaderCircle className="spin" size={26} /><p>กำลังตรวจสิทธิ์ผู้ดูแล</p></div> : state === 'login' ? <div className="owner-status"><ShieldCheck size={34} /><h2>{localMode ? "ผู้ดูแลสำหรับการใช้งานในเครื่อง" : "เข้าสู่ระบบผู้ดูแล"}</h2><p>{localMode ? "ใช้บัญชีผู้ดูแลจำลองของระบบในเครื่อง" : "ใช้บัญชีเจ้าของเว็บเพื่อใส่คีย์และเปิดใช้ AI"}</p><a className="button button-primary" href="/signin-with-chatgpt?return_to=/admin/settings" target="_top">{localMode ? "เข้าเป็นผู้ดูแลในเครื่อง" : "เข้าสู่ระบบผู้ดูแล"}</a></div> : state === 'denied' ? <div className="owner-status"><ShieldCheck size={34} /><h2>บัญชีนี้ไม่มีสิทธิ์ตั้งค่า AI</h2><p>กรุณาเข้าด้วยบัญชีเจ้าของเว็บ</p><a className="button button-primary" href="/signout-with-chatgpt?return_to=/admin/settings" target="_top">เปลี่ยนบัญชี</a></div> : state === 'error' ? <div className="owner-status" role="alert"><p>{error}</p><button className="button button-primary" onClick={() => void load()}>ลองอีกครั้ง</button></div> : localMode ? <div className="ai-settings-card local-settings-info"><ShieldCheck size={29} /><h2>ระบบกติกาในเครื่องพร้อมใช้งาน</h2><p>ม่านใจใช้ระบบกติกาในการตอบบทสนทนา คำตอบยังอาจไม่ตรงกับสิ่งที่คุณหมายถึง</p><div className="local-settings-status"><strong>AI ภายนอกปิดอยู่</strong><span>เวอร์ชันนี้ไม่ต้องใส่ API key</span></div>{localOrigin && <p className="local-settings-url">ที่อยู่ในเครื่อง <code>{localOrigin}</code></p>}<div className="button-row"><a className="button button-primary" href="/">กลับไปคุยกับม่านใจ <MessageCircle size={16} /></a><a className="button button-secondary" href="/admin">ดูประวัติผู้ใช้ <History size={16} /></a></div><p className="local-owner-note">บัญชีที่ใช้ดูแลหน้านี้เป็นผู้ดูแลจำลองสำหรับการใช้งานในเครื่อง</p></div> : <div className="ai-settings-card">
        <div className={`ai-connection-status ${status?.configured ? 'connected' : ''}`}><span className="ai-connection-dot" /><div><strong>{status?.configured ? 'เชื่อมต่อ AI แล้ว' : 'ยังไม่ได้เชื่อมต่อ AI'}</strong><p>{status?.configured ? `โมเดลที่ใช้งาน: ${status.model}` : 'ใส่ OpenAI API key เพื่อเริ่มใช้งาน'}</p></div>{status?.configured && <CheckCircle2 size={22} />}</div>
        <form onSubmit={save} className="ai-settings-form">
          <label htmlFor="openai-key">OpenAI API key</label>
          <input id="openai-key" type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" placeholder={status?.configured ? 'ใส่คีย์ใหม่เมื่อต้องการเปลี่ยน' : 'ใส่คีย์ของคุณที่นี่'} value={apiKey} onChange={event => setApiKey(event.target.value)} required maxLength={512} disabled={busy || !status?.ready} aria-describedby="key-help" />
          <p id="key-help" className="ai-field-help"><ShieldCheck size={14} /> คีย์จะถูกเข้ารหัสก่อนบันทึก และไม่แสดงให้ผู้ใช้เว็บเห็น</p>
          <label htmlFor="openai-model">โมเดล AI</label>
          <input id="openai-model" value={model} onChange={event => setModel(event.target.value)} autoComplete="off" spellCheck={false} required maxLength={150} disabled={busy || !status?.ready} />
          <p className="ai-field-help">ใช้ชื่อโมเดลที่บัญชี API ของคุณมีสิทธิ์ใช้งาน <a href="https://developers.openai.com/api/docs/models" target="_blank" rel="noreferrer">ดูรายชื่อโมเดล</a></p>
          {!status?.ready && <p className="error-box" role="alert">ระบบเก็บคีย์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง</p>}
          {error && <p className="error-box" role="alert">{error}</p>}
          {success && <p className="ai-save-success" role="status"><CheckCircle2 size={18} /> {success}</p>}
          <button className="button button-primary" type="submit" disabled={busy || !apiKey.trim() || !model.trim() || !status?.ready}>{busy ? <><LoaderCircle size={18} className="spin" /> กำลังตรวจสอบการเชื่อมต่อ…</> : <><KeyRound size={17} /> ตรวจสอบและเปิดใช้ AI</>}</button>
          <p className="ai-check-note">ปุ่มนี้ส่งข้อความทดสอบสั้น ๆ ไปยัง OpenAI ก่อนบันทึก การทดสอบและการแชทมีค่าใช้จ่ายตามบัญชี API ของคุณ</p>
        </form>
        {status?.updatedAt && <p className="ai-updated">บันทึกล่าสุด {new Date(status.updatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>}
      </div>}
    </section></div>
  </main>;
}
