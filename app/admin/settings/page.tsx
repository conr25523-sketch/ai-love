import type { Metadata } from 'next';
import AISettings from './settings';
import '../dashboard.css';
import './settings.css';

export const metadata: Metadata = { title: 'ตั้งค่า AI | ม่านใจ' };
export default function SettingsPage() { return <AISettings />; }
