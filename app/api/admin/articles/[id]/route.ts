import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission, canEditArticle } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { mvtLocalToDate } from '@/lib/mvt';
import { revalidatePath } from 'next/cache';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const article = await db.article.findUnique({
    where: { id },
    include: {
      category: true,
      author: { select: { id: true, name: true, avatar: true } },
      tags: true,
      revisions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { editor: { select: { name: true } } },
      },
    },
  });

  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(article);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';

  const article = await db.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!canEditArticle(userRole, article.authorId, session.user.id)) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const body = await request.json();
  const { title_dv, title_en, shortTitle_dv, shortTitle_en, content_dv, content_en, excerpt_dv, excerpt_en,
    metaTitle_dv, metaTitle_en, metaDescription_dv, metaDescription_en,
    featuredImage, featuredImageAlt_dv, featuredImageAlt_en,
    featuredImageCaption_dv, featuredImageCaption_en,
    categoryId, tags, status, isFeatured, isBreaking,
    scheduledAt, changeNote } = body;

  // Only editors+ can publish
  let articleStatus = status || article.status;
  if (articleStatus === 'PUBLISHED' && !hasPermission(userRole, 'article:publish')) {
    articleStatus = 'IN_REVIEW';
  }

  // A manual publish date (Maldives time) wins; otherwise stamp now on the first
  // publish, or keep whatever was already set.
  const publishedAt = mvtLocalToDate(body.publishedAt)
    ?? (articleStatus === 'PUBLISHED' && !article.publishedAt ? new Date() : article.publishedAt);

  const updated = await db.article.update({
    where: { id },
    data: {
      title_dv: title_dv ?? article.title_dv,
      title_en: title_en ?? article.title_en,
      shortTitle_dv: shortTitle_dv || null,
      shortTitle_en: shortTitle_en || null,
      content_dv: content_dv ?? article.content_dv,
      content_en: content_en ?? article.content_en,
      excerpt_dv,
      excerpt_en,
      metaTitle_dv,
      metaTitle_en,
      metaDescription_dv,
      metaDescription_en,
      featuredImage,
      galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : undefined,
      featuredImageAlt_dv,
      featuredImageAlt_en,
      featuredImageCaption_dv,
      featuredImageCaption_en,
      categoryId: categoryId || article.categoryId,
      // Only editors/super-admins may reassign the article's author.
      authorId: body.authorId && hasPermission(userRole, 'article:edit_any') ? body.authorId : undefined,
      status: articleStatus,
      isFeatured: isFeatured ?? article.isFeatured,
      isBreaking: isBreaking ?? article.isBreaking,
      scheduledAt: mvtLocalToDate(scheduledAt),
      publishedAt,
      tags: tags ? { set: tags.map((tid: string) => ({ id: tid })) } : undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: articleStatus === 'PUBLISHED' ? 'publish' : 'update',
    entity: 'Article',
    entityId: id,
    details: { title: updated.title_dv || updated.title_en, status: articleStatus },
  });

  // Create revision — best-effort; a revision failure (e.g. a stale session whose
  // editor no longer exists) must never break the article save itself.
  try {
    await db.revision.create({
      data: {
        articleId: id,
        editorId: session.user.id,
        title_dv: updated.title_dv,
        title_en: updated.title_en,
        content_dv: updated.content_dv,
        content_en: updated.content_en,
        changeNote: changeNote || `Status: ${articleStatus}`,
      },
    });
  } catch (e) {
    console.error('[revision] failed to write revision:', e);
  }

  // Revalidate public pages if published
  if (articleStatus === 'PUBLISHED') {
    revalidatePath(`/dv/news/${updated.slug}`);
    revalidatePath(`/en/news/${updated.slug}`);
    revalidatePath('/dv');
    revalidatePath('/en');
    // Warm the OG share-image cache so it's ready before the link is shared.
    const base = process.env.NEXT_PUBLIC_SITE_URL;
    if (base) {
      const wp = updated.id.replace(/^art_/, '');
      fetch(`${base}/dv/${encodeURIComponent(wp)}/opengraph-image`, { cache: 'no-store' }).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';

  if (!hasPermission(userRole, 'article:delete')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  await db.article.delete({ where: { id } });

  await logAudit({ userId: session.user.id, action: 'delete', entity: 'Article', entityId: id });

  return NextResponse.json({ success: true });
}
