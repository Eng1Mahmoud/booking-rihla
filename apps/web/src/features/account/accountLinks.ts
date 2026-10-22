import { UserRound, Ticket, ShieldCheck, CreditCard } from 'lucide-react';

export const accountLinks = [
  { href: '/account', label: 'profile', Icon: UserRound },
  { href: '/bookings', label: 'bookings', Icon: Ticket },
  { href: '/account/payments', label: 'payments', Icon: CreditCard },
  { href: '/account/security', label: 'security', Icon: ShieldCheck },
] as const;
