import { notFound } from 'next/navigation';
import XtShell from '@/app/preview/XtShell';
import ContactForm from '@/app/preview/ContactForm';
import { header, footer, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

export default async function ContactPage({
  params,
}: {
  params: Promise<Record<string, never>>;
}) {
  const lang = 'dv';
  void params;
  const L = lang as Lang;

  return (
    <XtShell html={header(L)} dir={L === 'dv' ? 'rtl' : 'ltr'}>
      <ContactForm lang={L} />
      <div dangerouslySetInnerHTML={{ __html: footer(L) }} />
    </XtShell>
  );
}