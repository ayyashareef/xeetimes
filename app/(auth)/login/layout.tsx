import type { Metadata } from 'next';

// The sign-in page is a client component, so it cannot export metadata itself —
// this layout exists only to carry it.
//
// Keeping the login screen out of search results and chat previews: robots.txt
// disallows /login, but chat scrapers ignore robots.txt, so the header is what
// actually does the work. A staff login form is not something the newsroom
// wants surfacing in a search result or unfurling in a group chat.
export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
