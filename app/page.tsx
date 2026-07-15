import { redirect } from 'next/navigation';

// Root: send visitors to the Dhivehi site. Also catch legacy WordPress internal
// links like /?p=15380 and forward them to the article (the pretty /15380
// permalinks are handled in app/[lang]/page.tsx).
export default async function RootPage({ searchParams }: { searchParams: Promise<{ p?: string; page_id?: string; feed?: string }> }) {
  const sp = await searchParams;
  // WordPress default feed URL (/?feed=rss2) — aggregators still use it.
  if (sp?.feed) redirect('/feed');
  const id = sp?.p || sp?.page_id;
  if (id && /^\d+$/.test(id)) redirect(`/dv/${id}`);
  redirect('/dv');
}
