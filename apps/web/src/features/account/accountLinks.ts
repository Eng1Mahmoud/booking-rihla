import { UserRound, Ticket, ShieldCheck } from 'lucide-react';

// Add payment history here when its page and API are complete.
export const accountLinks = [
  { href: '/account', label: 'profile', Icon: UserRound },
  { href: '/bookings', label: 'bookings', Icon: Ticket },
  { href: '/account/security', label: 'security', Icon: ShieldCheck },
] as const;
