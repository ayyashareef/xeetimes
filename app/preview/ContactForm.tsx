import type { Lang } from './markup';

const T = {
  dv: {
    title: 'ގުޅުއްވާ',
    intro: 'ސުވާލެއް ނުވަތަ ޚިޔާލެއް އޮތްތޯ؟ އަޅުގަނޑުމެން މިތިބީ އެހީތެރިވުމަށް. 24 ގަޑިއިރުގެ ތެރޭގައި ޖަވާބު ދޭނަން.',
    whatsapp: 'ވަޓްސްއެޕުން މެސެޖްކުރައްވާ',
    infoTitle: 'ގުޅޭނެ ގޮތްތައް',
    phoneL: 'ފޯން', emailL: 'އީމެއިލް',
  },
  en: {
    title: 'Get in Touch',
    intro: 'Have a question or feedback? We are here to help and respond within 24 hours.',
    whatsapp: 'Chat on WhatsApp',
    infoTitle: 'Contact details',
    phoneL: 'Phone', emailL: 'Email',
  },
} as const;

const WA = 'https://wa.me/9609415550';
const PHONE = '+960 941-5550';
const EMAIL = 'info@xeetimes.com';

// Contact page — details only (the message form was removed on request).
export default function ContactForm({ lang }: { lang: Lang }) {
  const t = T[lang];
  return (
    <section style={{ maxWidth: 640, margin: '0 auto', padding: '48px 32px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 34 }}>
        <h1 style={{ margin: 0, fontFamily: "'MV Waheed','Faruma',sans-serif", fontWeight: 800, fontSize: 38, color: 'var(--ink)' }}>{t.title}</h1>
        <p style={{ margin: '14px auto 0', maxWidth: 560, fontSize: 17, lineHeight: 1.9, color: 'var(--ink2)' }}>{t.intro}</p>
        <a href={WA} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 22, background: 'var(--red)', color: '#fff', padding: '12px 24px', borderRadius: 40, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm5 13.3c-.2.6-1.2 1.2-1.7 1.2-.5 0-1 .2-3.2-1.1-1.9-1.3-2.7-2.8-2.8-2.9-.1-.1-.6-.8-.6-1.6s.4-1.1.6-1.3c.1-.1.3-.2.5-.2h.3c.2 0 .3 0 .5.4l.6 1.4c0 .1 0 .3-.1.4l-.3.3c-.1.1-.2.2-.1.4.1.2.5.8 1 1.3.7.6 1.3.8 1.5.9.2.1.3.1.4-.1l.4-.5c.2-.2.3-.2.5-.1l1.3.6c.2.1.3.2.4.2.1.2.1.5-.1 1Z" /></svg>
          {t.whatsapp}
        </a>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
        <h2 style={{ margin: '0 0 18px', fontFamily: "'MV Waheed','Faruma',sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{t.infoTitle}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <a href={`tel:${PHONE.replace(/[^+\d]/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--ink)' }}>
            <span style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--bg)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1l-2.2 2Z" /></svg>
            </span>
            <span><span style={{ display: 'block', fontSize: 12, color: 'var(--ink3)' }}>{t.phoneL}</span><span dir="ltr" style={{ fontSize: 15, fontWeight: 600 }}>{PHONE}</span></span>
          </a>
          <a href={`mailto:${EMAIL}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--ink)' }}>
            <span style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--bg)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
            </span>
            <span><span style={{ display: 'block', fontSize: 12, color: 'var(--ink3)' }}>{t.emailL}</span><span dir="ltr" style={{ fontSize: 15, fontWeight: 600 }}>{EMAIL}</span></span>
          </a>
        </div>
      </div>
    </section>
  );
}
