'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TipTapLink from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { ImageWithCaption } from '@/lib/image-caption';
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

const DV_MONTHS = ['ޖެނުއަރީ', 'ފެބްރުއަރީ', 'މާރިޗު', 'އޭޕްރީލު', 'މޭ', 'ޖޫން', 'ޖުލައި', 'އޯގަސްޓު', 'ސެޕްޓެމްބަރު', 'އޮކްޓޯބަރު', 'ނޮވެމްބަރު', 'ޑިސެމްބަރު'];
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
      QuoteWithAuthor,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TipTapLink.configure({ openOnClick: false }),
      ImageWithCaption,
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
          'prose max-w-none min-h-[300px] outline-none px-4 py-3',
          dir === 'rtl' && 'font-dv-body text-right',
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
  const insertImage = (url: string) => {
    const caption = (prompt('Photo caption / credit (optional):') || '').trim();
    editor.chain().focus().insertContent({
      type: 'imageWithCaption',
      attrs: { src: url.trim(), caption },
    }).run();
  };

  const handleSingleSelect = (url: string) => {
    insertImage(url);
  };

  const handleMultipleSelect = (urls: string[]) => {
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

  const ToolButton = ({ onClick, active, children, title }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
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

  return (
    <>
      <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 bg-gray-50">
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

        <EditorContent editor={editor} />
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
