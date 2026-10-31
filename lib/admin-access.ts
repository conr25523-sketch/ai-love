type Identity = { userId: string; email: string } | null;
const values = (value?: string) => (value ?? '').split(',').map(item => item.trim()).filter(Boolean);

/** Identity must come from dispatch-owned authentication, never request JSON. */
export function configuredAdminIds(identity: Identity, ids?: string, emails?: string): string[] {
  const configured = values(ids);
  const ownerEmails = values(emails).map(email => email.toLowerCase());
  if (identity?.userId && identity.email?.trim() && ownerEmails.includes(identity.email.trim().toLowerCase())) {
    configured.push(identity.userId);
  }
  return [...new Set(configured)];
}
