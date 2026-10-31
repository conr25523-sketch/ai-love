"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, History, KeyRound, LoaderCircle, LogOut, MessageCircle, Moon, Search, ShieldCheck, Users } from 'lucide-react';
import DeleteUserButton from '../../components/delete-user-button';

type User = { id: string; name: string; updatedAt: number; messageCount: number; canDelete: boolean };
type Message = { id: string; role: 'user' | 'assistant'; content: string; createdAt: number };
type Session = { isAdmin: boolean; authenticated: boolean; user: { name: string } | null; localMode?: boolean };
class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function read<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new ApiError(typeof data.error === 'string' ? data.error : 'โหลดข้อมูลไม่สำเร็จ', response.status);
  return data as T;
}

export default function AdminDashboard() {
  const [state, setState] = useState<'loading' | 'ready' | 'login' | 'denied' | 'error'>('loading');
  const [localMode, setLocalMode] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');
  const detailRequest = useRef(0);
  const load = useCallback(async () => {
    setState('loading'); setError(''); setDeleteStatus(''); setSelected(null); setMessages([]); detailRequest.current++;
    try {
      const session = await read<Session>('/api/session');
      setLocalMode(session.localMode === true);
      if (!session.authenticated) { setState('login'); return; }
      if (!session.isAdmin) { setState('denied'); return; }
      const result = await read<{ users: User[] }>('/api/admin/users');
      setUsers(result.users); setState('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setState('login');
      else { setState('error'); setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'); }
    }
  }, []);
  useEffect(() => { void load(); return () => { detailRequest.current++; }; }, [load]);
  async function open(user: User) {
    const request = ++detailRequest.current;
    setSelected(user); setMessages([]); setLoadingDetail(true); setDetailError('');
    try {
      const result = await read<{ messages: Message[] }>('/api/admin/messages?userId=' + encodeURIComponent(user.id));
      if (request === detailRequest.current) setMessages(result.messages);
    } catch (err) {
      if (request === detailRequest.current) setDetailError(err instanceof Error ? err.message : 'โหลดบทสนทนาไม่สำเร็จ');
    } finally { if (request === detailRequest.current) setLoadingDetail(false); }
  }
  const visible = users.filter(user => user.name.toLocaleLowerCase('th').includes(query.trim().toLocaleLowerCase('th')));
  function accountDeleted(id: string, name: string) {
    detailRequest.current++;
    setUsers(previous => previous.filter(user => user.id !== id));
    setSelected(null); setMessages([]); setLoadingDetail(false); setDetailError('');
    setDeleteStatus(`ลบบัญชี ${name} และประวัติทั้งหมดแล้ว`);
  }
  return <main className="owner-dashboard">
    <header className="owner-header"><a href="/" className="owner-brand"><Moon size={25} /><strong>ม่านใจ<span>.</span></strong><span className="owner-tag"><ShieldCheck size={13} /> {localMode ? "ผู้ดูแลในเครื่อง" : "ผู้ดูแลเว็บ"}</span></a><a className="text-button" href="/">กลับหน้าแชท <ArrowLeft size={15} /></a></header>
    <div className="owner-layout"><aside className="owner-navigation"><span className="sidebar-eyebrow">จัดการเว็บของคุณ</span><a className="sidebar-item" href="/"><MessageCircle size={18} /> แชทดูดวง</a><a className="sidebar-item active" href="/admin" aria-current="page"><History size={18} /> ประวัติผู้ใช้</a>{localMode ? <span className="sidebar-item sidebar-disabled" aria-disabled="true"><KeyRound size={18} /> AI ภายนอกปิดอยู่</span> : <a className="sidebar-item" href="/admin/settings"><KeyRound size={18} /> ตั้งค่า AI</a>}<p>ตรวจดูบทสนทนาที่ผู้ใช้อนุญาตให้คุณเข้าถึง เพื่อดูแลคุณภาพบริการ</p><a className="sidebar-item owner-signout" href="/signout-with-chatgpt?return_to=/admin" target="_top"><LogOut size={17} /> ออกจากระบบ</a></aside>
    <section className="owner-content"><div className="admin-heading"><span className="eyebrow">{localMode ? "LOCAL OWNER · CONVERSATION HISTORY" : "ADMIN · CONVERSATION HISTORY"}</span><h1>ประวัติการคุยของผู้ใช้</h1><p>เลือกชื่อผู้ใช้เพื่ออ่านบทสนทนาและเวลาที่ส่งข้อความ</p>{localMode && <p className="local-owner-note">โหมดในเครื่อง · บัญชีผู้ดูแลจำลอง · ระบบตอบด้วยกติกา</p>}</div>
      {state === 'loading' ? <div className="owner-status" role="status"><LoaderCircle className="spin" size={26} /><p>กำลังตรวจสิทธิ์และโหลดประวัติ</p></div> : state === 'login' ? <div className="owner-status"><ShieldCheck size={34} /><h2>{localMode ? "ผู้ดูแลสำหรับการใช้งานในเครื่อง" : "เข้าสู่ระบบผู้ดูแล"}</h2><p>{localMode ? "ใช้บัญชีผู้ดูแลจำลองในเครื่องเพื่อดูแลประวัติที่ได้รับอนุญาต" : "ใช้บัญชีเจ้าของเว็บที่ได้รับสิทธิ์ผู้ดูแล"}</p><a className="button button-primary" href="/signin-with-chatgpt?return_to=/admin" target="_top">{localMode ? "เข้าเป็นผู้ดูแลในเครื่อง" : "เข้าสู่ระบบ"}</a></div> : state === 'denied' ? <div className="owner-status"><ShieldCheck size={34} /><h2>บัญชีนี้ยังไม่มีสิทธิ์ผู้ดูแล</h2><p>ออกจากระบบแล้วเข้าด้วยบัญชีเจ้าของเว็บที่ตั้งสิทธิ์ไว้</p><a className="button button-primary" href="/signout-with-chatgpt?return_to=/admin" target="_top">เปลี่ยนบัญชี</a></div> : state === 'error' ? <div className="owner-status" role="alert"><h2>โหลดหน้าผู้ดูแลไม่สำเร็จ</h2><p>{error}</p><button className="button button-primary" onClick={() => void load()}>ลองอีกครั้ง</button></div> : <>
        <div className="owner-stats"><div><Users size={19} /><strong>{users.length}</strong><span>ผู้ใช้ที่ยินยอมแชร์ประวัติ</span></div><div><MessageCircle size={19} /><strong>{users.reduce((sum, user) => sum + user.messageCount, 0)}</strong><span>ข้อความที่เปิดอ่านได้</span></div><button className="button button-secondary" onClick={() => void load()}>รีเฟรชประวัติ</button></div>
        <div className="owner-consent"><ShieldCheck size={16} /><span>แสดงเฉพาะผู้ใช้ที่ยินยอมให้ผู้ดูแลตรวจบทสนทนา หากถอนความยินยอมจะเปิดประวัตินั้นไม่ได้</span></div>
        {deleteStatus && <p className="account-delete-status" role="status">{deleteStatus}</p>}<div className="admin-grid"><div className="history-users"><div className="history-list-title"><strong>รายชื่อผู้ใช้</strong><span>{visible.length}</span></div><label className="owner-search"><Search size={16} /><input aria-label="ค้นหาชื่อผู้ใช้" placeholder="ค้นหาชื่อผู้ใช้…" value={query} onChange={event => setQuery(event.target.value)} /></label>
          {!visible.length && <div className="owner-list-empty"><Users size={26} /><strong>{users.length ? 'ไม่พบชื่อที่ค้นหา' : 'ยังไม่มีประวัติที่ได้รับอนุญาต'}</strong><p>{users.length ? 'ลองค้นหาด้วยชื่ออื่น' : 'รายชื่อจะปรากฏเมื่อมีผู้ใช้ยินยอมให้ตรวจบทสนทนา'}</p></div>}
          {visible.map(user => <button className={`history-user ${selected?.id === user.id ? 'selected' : ''}`} key={user.id} onClick={() => void open(user)}><span className="avatar">{user.name.slice(0, 1)}</span><span><strong>{user.name}</strong><small>{user.messageCount} ข้อความ · {new Date(user.updatedAt).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</small></span><ChevronRight size={16} /></button>)}
        </div><div className="history-content">{loadingDetail ? <div className="history-empty" role="status"><LoaderCircle className="spin" size={26} /><p>กำลังโหลดบทสนทนา</p></div> : detailError ? <div className="error-box" role="alert"><p>{detailError}</p><button className="text-button" onClick={() => selected && void open(selected)}>ลองอีกครั้ง</button></div> : selected ? <><div className="history-detail-heading"><h2>บทสนทนาของ {selected.name}</h2><DeleteUserButton user={selected} disabled={loadingDetail} onDeleted={accountDeleted} /></div><p className="history-account-id account-id">ID: {selected.id}</p>{!messages.length && <p className="muted">ผู้ใช้รายนี้ยังไม่มีข้อความที่บันทึกไว้</p>}{messages.map(message => <article className={`message ${message.role}`} key={message.id}><div className="message-body"><span className="message-label">{message.role === 'user' ? selected.name : 'ม่านใจ'}<time dateTime={new Date(message.createdAt).toISOString()}>{new Date(message.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' })}</time></span><div className="message-text">{message.content}</div></div></article>)}</> : <div className="history-empty"><History size={32} /><h2>เลือกผู้ใช้เพื่ออ่านประวัติ</h2><p>ข้อความจริงที่บันทึกไว้จะแสดงตรงนี้</p></div>}</div></div>
      </>}
    </section></div>
  </main>;
}
