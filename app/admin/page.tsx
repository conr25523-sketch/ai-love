import type { Metadata } from 'next';
import AdminDashboard from './dashboard';
import './dashboard.css';

export const metadata: Metadata = { title: 'ผู้ดูแลเว็บ · ประวัติผู้ใช้ | ม่านใจ' };
export default function AdminPage() { return <AdminDashboard />; }
