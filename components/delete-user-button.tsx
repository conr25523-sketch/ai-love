"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Trash2, X } from "lucide-react";

type Target = { id: string; name: string; messageCount: number; canDelete?: boolean };

export default function DeleteUserButton({ user, disabled = false, onDeleted }: { user: Target; disabled?: boolean; onDeleted: (id: string, name: string) => void }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const close = () => { if (!submitting.current) setTarget(null); };
  useEffect(() => {
    if (!target) return;
    cancel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting.current) setTarget(null);
      if (event.key === "Tab" && dialog.current) {
        const controls = dialog.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
        if (!controls.length) { event.preventDefault(); return; }
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); trigger.current?.focus(); };
  }, [target]);

  async function remove() {
    if (!target || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.id, confirmName: target.name, confirmed: true }),
      });
      const data = await response.json() as { error?: string; deletedUserId?: string };
      if (!response.ok) throw new Error(data.error || "ลบบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง");
      if (data.deletedUserId !== target.id) throw new Error("ผลการลบบัญชีไม่ตรงกัน กรุณารีเฟรชรายชื่อ");
      setTarget(null); onDeleted(target.id, target.name);
    } catch (err) { setError(err instanceof Error ? err.message : "ลบบัญชีไม่สำเร็จ"); }
    finally { submitting.current = false; setBusy(false); }
  }

  return <>
    <button ref={trigger} type="button" className="button button-danger account-delete-trigger" disabled={disabled || busy || user.canDelete === false} title={user.canDelete === false ? "บัญชีผู้ดูแลไม่สามารถลบผ่านหน้าประวัติได้" : undefined} onClick={() => { setError(""); setTarget({ ...user }); }}><Trash2 size={15} /> ลบบัญชีนี้</button>
    {target && createPortal(<div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <section ref={dialog} className="onboarding account-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="account-delete-title" aria-describedby="account-delete-description" aria-busy={busy}>
        <button type="button" className="modal-close icon-button" aria-label="ปิดหน้าต่างยืนยันลบบัญชี" disabled={busy} onClick={close}><X size={20} /></button>
        <Trash2 className="modal-symbol danger" size={30} />
        <h2 id="account-delete-title">ลบบัญชีนี้ถาวร?</h2>
        <p id="account-delete-description">จะลบรายชื่อ บทสนทนาทั้งหมด และความจำจากบทสนทนาของ <strong>{target.name}</strong> กู้คืนไม่ได้</p>
        <dl className="account-delete-summary"><dt>ชื่อผู้ใช้</dt><dd>{target.name}</dd><dt>ID บัญชี</dt><dd className="account-id">{target.id}</dd><dt>ข้อความที่แสดงในรายชื่อ</dt><dd>{target.messageCount} ข้อความ</dd></dl>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="button-row"><button ref={cancel} type="button" className="button button-secondary" disabled={busy} onClick={close}>ยกเลิก</button><button type="button" className="button button-danger" disabled={busy} onClick={() => void remove()}>{busy ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={16} />}{busy ? "กำลังลบบัญชี…" : "ยืนยันลบบัญชีถาวร"}</button></div>
      </section>
    </div>, document.body)}
  </>;
}
