import { notFound } from 'next/navigation';
import XtShell from '../../preview/XtShell';
import ContactForm from '../../preview/ContactForm';
import { header, footer, type Lang } from '../../preview/markup';

export const dynamic = 'force-dynamic';
const LANGS = ['dv', 'en'];

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  const L = lang as Lang;

  return (
    <XtShell html={header(L)} dir={L === 'dv' ? 'rtl' : 'ltr'}>
      <ContactForm lang={L} />
      <div dangerouslySetInnerHTML={{ __html: footer(L) }} />
    </XtShell>
  );
}
