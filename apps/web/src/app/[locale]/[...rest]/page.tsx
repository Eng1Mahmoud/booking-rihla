import { notFound } from 'next/navigation';

// Keep unknown URLs inside the localized site shell and its 404 boundary.
export default function UnknownPage() {
  notFound();
}
