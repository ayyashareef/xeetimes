import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DV_MONTHS = [
  'ޖެނުއަރީ', 'ފެބުރުއަރީ', 'މާރިޗު', 'އެޕްރީލް', 'މެއި', 'ޖޫން',
  'ޖުލައި', 'އޯގަސްޓު', 'ސެޕްޓެމްބަރު', 'އޮކްޓޯބަރު', 'ނޮވެމްބަރު', 'ޑިސެމްބަރު',
];

function toDvDigits(num: number | string): string {
  return String(num);
}

export function formatDate(date: Date | string, lang: 'dv' | 'en' = 'en') {
  const d = new Date(date);
  if (lang === 'dv') {
    const day = d.getDate();
    const month = DV_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${toDvDigits(day)} ${month} ${toDvDigits(year)}`;
  }
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string, lang: 'dv' | 'en' = 'en') {
  const d = new Date(date);
  if (lang === 'dv') {
    const day = d.getDate();
    const month = DV_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'މެންދުރުފަހު' : 'މެންދުރުކުރި';
    const h12 = hours % 12 || 12;
    return `${toDvDigits(day)} ${month} ${toDvDigits(year)} ${toDvDigits(h12)}:${toDvDigits(minutes)}`;
  }
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMaldivesTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Indian/Maldives',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMaldivesTimeDv() {
  return new Date().toLocaleString('dv-MV', {
    timeZone: 'Indian/Maldives',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date: Date | string, lang: 'dv' | 'en' = 'en') {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const intervals = [
    { en: 'year', dv: 'އަހަރު', seconds: 31536000 },
    { en: 'month', dv: 'މަސް', seconds: 2592000 },
    { en: 'week', dv: 'ހަފްތާ', seconds: 604800 },
    { en: 'day', dv: 'ދުވަސް', seconds: 86400 },
    { en: 'hour', dv: 'ގަޑިއިރު', seconds: 3600 },
    { en: 'minute', dv: 'މިނެޓު', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      if (lang === 'dv') {
        return `${count} ${interval.dv} ކުރިން`;
      }
      return `${count} ${interval.en}${count > 1 ? 's' : ''} ago`;
    }
  }

  return lang === 'dv' ? 'ދެންމެ' : 'Just now';
}
