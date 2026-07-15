import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { mvtLocalToDate } from '@/lib/mvt';
import slugify from 'slugify';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  const categoryId = searchParams.get('categoryId');
  const search = searchParams.get('search');

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  const where: Record<string, unknown> = {};

  // Journalists can only see their own articles
  if (!hasPermission(userRole, 'article:view_all')) {
    where.authorId = session.user.id;
  }

  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { title_en: { contains: search, mode: 'insensitive' } },
      { title_dv: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [articles, total] = await Promise.all([
    db.article.findMany({
      where: where as any,
      include: {
        category: { select: { name_en: true, name_dv: true } },
        author: { select: { name: true, avatar: true } },
        _count: { select: { comments: true } },
      },
      // Newest published first; unpublished (null publishedAt) at the top so
      // drafts/in-review work stays visible.
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'first' } }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.article.count({ where: where as any }),
  ]);

  return NextResponse.json({
    articles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'article:create')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const body = await request.json();
  const { title_dv, title_en, shortTitle_dv, shortTitle_en, content_dv, content_en, excerpt_dv, excerpt_en,
    metaTitle_dv, metaTitle_en, metaDescription_dv, metaDescription_en,
    featuredImage, featuredImageAlt_dv, featuredImageAlt_en,
    featuredImageCaption_dv, featuredImageCaption_en,
    categoryId, tags, status, isFeatured, isBreaking,
    scheduledAt } = body;

  // A category is mandatory (the schema requires it; without this check a
  // missing category surfaces as an opaque 500 instead of a clear message).
  if (!categoryId) {
    return NextResponse.json({ error: 'Please select a category' }, { status: 400 });
  }

  // Generate slug from English title
  let slug = slugify(title_en || title_dv || 'untitled', { lower: true, strict: true });

  // Ensure unique slug
  const existing = await db.article.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Only editors+ can publish directly
  let articleStatus = status || 'DRAFT';
  if (articleStatus === 'PUBLISHED' && !hasPermission(userRole, 'article:publish')) {
    articleStatus = 'IN_REVIEW';
  }

  // New articles continue the old WordPress numeric id sequence
  // (Article.id = "art_<n>" -> public URL /<lang>/<n>, like every migrated
  // article). Without this Prisma assigns a cuid and the URL turns ugly.
  const nextId = async () => {
    const [row] = await db.$queryRaw<{ n: number | null }[]>`
      SELECT MAX((substring(id from '^art_([0-9]+)$'))::int) AS n FROM "Article"`;
    return `art_${Number(row?.n ?? 0) + 1}`;
  };

  const articleData = {
    slug,
    title_dv: title_dv || '',
    title_en: title_en || '',
    shortTitle_dv: shortTitle_dv || null,
    shortTitle_en: shortTitle_en || null,
    content_dv: content_dv || '',
    content_en: content_en || '',
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
    categoryId,
    // Editors/super-admins may attribute the article to someone else;
    // journalists always publish as themselves.
    authorId: (body.authorId && hasPermission(userRole, 'article:edit_any')) ? body.authorId : session.user.id,
    status: articleStatus,
    isFeatured: isFeatured || false,
    isBreaking: isBreaking || false,
    scheduledAt: mvtLocalToDate(scheduledAt),
    publishedAt: mvtLocalToDate(body.publishedAt) ?? (articleStatus === 'PUBLISHED' ? new Date() : null),
    tags: tags?.length ? { connect: tags.map((tagId: string) => ({ id: tagId })) } : undefined,
  };

  let article;
  for (let attempt = 0; ; attempt++) {
    try {
      article = await db.article.create({ data: { id: await nextId(), ...articleData } });
      break;
    } catch (e) {
      // P2002 = id taken by a concurrent create; recompute and retry.
      if (attempt < 3 && (e as { code?: string })?.code === 'P2002') continue;
      throw e;
    }
  }

  await logAudit({
    userId: session.user.id,
    action: 'create',
    entity: 'Article',
    entityId: article.id,
    details: { title: article.title_dv || article.title_en, status: articleStatus },
  });

  // Create initial revision
  await db.revision.create({
    data: {
      articleId: article.id,
      editorId: session.user.id,
      title_dv: title_dv || '',
      title_en: title_en || '',
      content_dv: content_dv || '',
      content_en: content_en || '',
      changeNote: 'Initial creation',
    },
  });

  return NextResponse.json(article, { status: 201 });
}
