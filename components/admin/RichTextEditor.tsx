'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import TipTapLink from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { ImageWithCaption } from '@/lib/image-caption';
import { VideoClip } from '@/lib/video-node';
import { Gallery } from '@/lib/gallery-extension';
import { QuoteWithAuthor } from '@/lib/quote-extension';
import Placeholder from '@tiptap/extension-placeholder';
import MediaPicker from './MediaPicker';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Minus, Undo, Redo,
  Link as LinkIcon, ImageIcon, Youtube as YoutubeIcon,
  Heading1, Heading2, Heading3, Code, Share2, LayoutGrid, Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialEmbed, detectPlatform } from '@/lib/social-embed';
import { ArticleCard } from '@/lib/article-card';
import ArticlePicker, { type PickArticle } from './ArticlePicker';

const DV_MONTHS = ['ޖެނުއަރީ', 'ފެބްރުއަރީ', 'މާޗް', 'އޭޕްރީލު', 'މެއި', 'ޖޫން', 'ޖުލައި', 'އޯގަސްޓު', 'ސެޕްޓެމްބަރ', 'އޮކްޓޯބަރ', 'ނޮވެމްބަރ', 'ޑިސެމްބަރ'];
// Defined at module scope on purpose. It used to live inside RichTextEditor,
// which made it a NEW component type on every render — and Tiptap re-renders on
// every transaction, selection changes included. React therefore threw away and
// rebuilt every toolbar button whenever the caret moved, so pressing Bold went:
// mousedown on the button, selection transaction, re-render, button replaced,
// mouseup on a different element. A click only fires when both halves land on
// the same node, so no click ever fired and Bold appeared dead.
//
// onMouseDown is swallowed so pressing a button never pulls the caret out of
// the editor — without it the selection collapses and the command applies to
// nothing. This is the documented Tiptap pattern for toolbar buttons.
function ToolButton({ onClick, active, children, title }: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded hover:bg-gray-100 transition',
        active && 'bg-primary-100 text-primary'
      )}
    >
      {children}
    </button>
  );
}

function mvDate(iso: string | null): string {
  if (!iso) return '';
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Indian/Maldives', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(iso)).reduce<Record<string, string>>((o, x) => { o[x.type] = x.value; return o; }, {});
  return `${Number(p.day)} ${DV_MONTHS[Number(p.month) - 1]} ${p.year}`;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  dir?: 'rtl' | 'ltr';
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  dir = 'ltr',
  placeholder = 'Start writing...',
  className,
}: RichTextEditorProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'single' | 'gallery'>('single');
  const [articlePickerOpen, setArticlePickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ blockquote: false }),
      // Color stores the colour as a style on a TextStyle mark, so both are needed.
      TextStyle,
      Color,
      QuoteWithAuthor,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TipTapLink.configure({ openOnClick: false }),
      ImageWithCaption,
      VideoClip,
      Gallery,
      Youtube.configure({ width: 640, height: 360 }),
      SocialEmbed,
      ArticleCard,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          // A tall article used to push the toolbar off the top of the screen,
          // so bolding a word near the end meant scrolling back up. The content
          // scrolls inside its own box instead and the toolbar stays put.
          // Scrolling lives on the wrapper below, not here: a browser puts the
          // scrollbar on the LEFT of an RTL element, and the newsroom reads it
          // on the right like every other scrollbar on their screen.
          'prose max-w-none outline-none px-4 py-3 min-h-[300px]',
          dir === 'rtl' && 'font-dv-article text-right',
        ),
        dir,
      },
    },
  });

  if (!editor) return null;

  const openImagePicker = () => {
    setMediaPickerMode('single');
    setMediaPickerOpen(true);
  };

  const openGalleryPicker = () => {
    setMediaPickerMode('gallery');
    setMediaPickerOpen(true);
  };

  // Ask for a caption/credit on insert so the feature is discoverable (it can
  // still be edited later by clicking the caption under the image).
  // The picker lists videos as well as photos, so what gets inserted has to
  // follow the file. Inserting a clip as an image produced a broken image icon
  // in the middle of the article.
  const isVideoUrl = (u: string) => /\.(mp4|webm|ogv|ogg|mov)(\?|#|$)/i.test(u.trim());

  const insertImage = (url: string) => {
    const src = url.trim();
    if (isVideoUrl(src)) {
      const caption = (prompt('Video caption / credit (optional):') || '').trim();
      editor.chain().focus().insertContent({ type: 'videoClip', attrs: { src, caption } }).run();
      return;
    }
    const caption = (prompt('Photo caption / credit (optional):') || '').trim();
    editor.chain().focus().insertContent({
      type: 'imageWithCaption',
      attrs: { src, caption },
    }).run();
  };

  const handleSingleSelect = (url: string) => {
    insertImage(url);
  };

  const handleMultipleSelect = (urls: string[]) => {
    // Clips are inserted one by one as video blocks; only photos can form a
    // gallery, which is a grid of thumbnails opening a lightbox.
    const videos = urls.filter(isVideoUrl);
    const photos = urls.filter((u) => !isVideoUrl(u));
    for (const v of videos) {
      editor.chain().focus().insertContent({ type: 'videoClip', attrs: { src: v.trim(), caption: '' } }).run();
    }
    if (photos.length === 0) return;
    urls = photos;
    if (urls.length === 1) {
      insertImage(urls[0]);
    } else {
      editor.chain().focus().insertContent({
        type: 'gallery',
        attrs: {
          images: urls.map(url => ({ src: url.trim(), caption: '' })),
        },
      }).run();
    }
  };

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addYoutube = () => {
    const url = prompt('Enter YouTube URL:');
    if (url) editor.commands.setYoutubeVideo({ src: url });
  };

  const insertArticleCard = (a: PickArticle) => {
    setArticlePickerOpen(false);
    const id = (a.id || '').replace(/^art_/, '');
    editor.chain().focus().insertContent({
      type: 'articleCard',
      attrs: {
        href: `/dv/${id}`,
        title: a.shortTitle_dv || a.title_dv || a.title_en || '',
        category: a.category?.name_dv || a.category?.name_en || '',
        date: mvDate(a.publishedAt),
        image: a.featuredImage || '',
      },
    }).run();
  };

  const addSocialEmbed = () => {
    const url = prompt('Enter X (Twitter) or Facebook post URL:');
    if (!url) return;
    const detected = detectPlatform(url.trim());
    if (!detected) {
      alert('Invalid URL. Please enter a valid X/Twitter or Facebook post URL.');
      return;
    }
    editor.chain().focus().insertContent({
      type: 'socialEmbed',
      attrs: { url: url.trim(), platform: detected.platform },
    }).run();
  };

  return (
    <>
      <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 bg-gray-50">
          <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Heading3 className="w-4 h-4" />
          </ToolButton>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Colours the newsroom actually uses: the brand red for emphasis, a
              couple of neutrals, and "reset" to clear back to the body colour.
              The swatch is a native colour input for anything else. */}
          <span className="flex items-center gap-1 pe-1">
            {[
              { c: '#c8102e', label: 'Red' },
              { c: '#1b5e20', label: 'Green' },
              { c: '#0a2350', label: 'Navy' },
            ].map(({ c, label }) => (
              <button
                key={c}
                type="button"
                title={label}
                onClick={() => editor.chain().focus().setColor(c).run()}
                className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition"
                style={{ background: c }}
              />
            ))}
            <label
              title="Pick a colour"
              className="w-5 h-5 rounded border border-gray-300 overflow-hidden cursor-pointer relative"
              style={{ background: 'linear-gradient(135deg,#e11,#fb0,#0a0,#08f,#a0f)' }}
            >
              <input
                type="color"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            <button
              type="button"
              title="Remove colour"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="px-1.5 h-5 rounded border border-gray-300 text-[10px] leading-none text-gray-600 hover:bg-gray-100"
            >
              A&#818;
            </button>
          </span>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <UnderlineIcon className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </ToolButton>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
            <AlignRight className="w-4 h-4" />
          </ToolButton>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <List className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
            <ListOrdered className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <Quote className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
            <Code className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus className="w-4 h-4" />
          </ToolButton>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolButton onClick={addLink} title="Add Link">
            <LinkIcon className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={openImagePicker} title="Add Image">
            <ImageIcon className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={openGalleryPicker} title="Add Gallery">
            <LayoutGrid className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={addYoutube} title="Add YouTube Video">
            <YoutubeIcon className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={addSocialEmbed} title="Embed X/Facebook Post">
            <Share2 className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => setArticlePickerOpen(true)} title="Link another article (card)">
            <Newspaper className="w-4 h-4" />
          </ToolButton>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <Undo className="w-4 h-4" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <Redo className="w-4 h-4" />
          </ToolButton>
        </div>

        {/* dir="ltr" on the SCROLLING box puts the scrollbar on the right; the
            editor inside keeps its own dir, so the Thaana still runs
            right-to-left. Direction is what decides which edge a scrollbar
            sits on, and it is inherited — so the two have to be separated. */}
        <div dir="ltr" className="max-h-[65vh] overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleSingleSelect}
        onSelectMultiple={handleMultipleSelect}
        multiple={mediaPickerMode === 'gallery'}
      />

      <ArticlePicker
        open={articlePickerOpen}
        onClose={() => setArticlePickerOpen(false)}
        onSelect={insertArticleCard}
      />
    </>
  );
}
