// Types para o sistema de Page Builder Avançado

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  styling: BlockStyling;
  order: number;
  visible: boolean;
  conditions?: BlockCondition[];
}

export type BlockType = 
  | 'text'
  | 'hero'
  | 'features'
  | 'gallery'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'contact-form'
  | 'contact-info'
  | 'article-header'
  | 'video'
  | 'map'
  | 'stats'
  | 'timeline'
  | 'pricing'
  | 'team'
  | 'divider'
  | 'spacer'
  | 'html';

export interface BlockStyling {
  backgroundColor?: string;
  textColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  boxShadow?: string;
  animation?: string;
  customClasses?: string[];
  responsive?: {
    desktop?: Partial<BlockStyling>;
    tablet?: Partial<BlockStyling>;
    mobile?: Partial<BlockStyling>;
  };
}

export interface BlockCondition {
  type: 'device' | 'user' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

// Blocks específicos
export interface HeroBlock extends ContentBlock {
  type: 'hero';
  content: {
    title: string;
    subtitle?: string;
    description?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
    ctaText?: string;
    ctaLink?: string;
    ctaSecondaryText?: string;
    ctaSecondaryLink?: string;
    alignment: 'left' | 'center' | 'right';
    overlay?: boolean;
    overlayOpacity?: number;
  };
}

export interface TextBlock extends ContentBlock {
  type: 'text';
  content: {
    html: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
  };
}

export interface FeaturesBlock extends ContentBlock {
  type: 'features';
  content: {
    title?: string;
    description?: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
      icon?: string;
      image?: string;
      link?: string;
    }>;
    layout: 'grid' | 'list' | 'carousel';
    columns: 2 | 3 | 4;
  };
}

export interface GalleryBlock extends ContentBlock {
  type: 'gallery';
  content: {
    images: Array<{
      id: string;
      url: string;
      alt: string;
      caption?: string;
    }>;
    layout: 'grid' | 'masonry' | 'carousel' | 'lightbox';
    columns: 2 | 3 | 4 | 5;
  };
}

export interface TestimonialsBlock extends ContentBlock {
  type: 'testimonials';
  content: {
    title?: string;
    items: Array<{
      id: string;
      name: string;
      role?: string;
      company?: string;
      avatar?: string;
      content: string;
      rating?: number;
    }>;
    layout: 'slider' | 'grid' | 'list';
  };
}

export interface ContactFormBlock extends ContentBlock {
  type: 'contact-form';
  content: {
    title?: string;
    fields: Array<{
      id: string;
      type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'file';
      name: string;
      label: string;
      placeholder?: string;
      required: boolean;
      options?: string[]; // para select
    }>;
    submitText: string;
    successMessage: string;
    emailTo?: string;
  };
}

export interface VideoBlock extends ContentBlock {
  type: 'video';
  content: {
    url: string;
    provider: 'youtube' | 'vimeo' | 'direct';
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
    poster?: string;
    aspectRatio: '16:9' | '4:3' | '1:1' | 'custom';
  };
}

export interface StatsBlock extends ContentBlock {
  type: 'stats';
  content: {
    title?: string;
    items: Array<{
      id: string;
      value: number | string;
      label: string;
      suffix?: string;
      prefix?: string;
      animateCounter?: boolean;
      icon?: string;
    }>;
    layout: 'horizontal' | 'vertical' | 'grid';
  };
}

// Page Template
export interface PageTemplate {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  previewImage?: string;
  templateData: TemplateData;
  defaultBlocks: ContentBlock[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateData {
  layout: 'single-column' | 'two-column' | 'full-width' | 'article' | 'landing';
  header: boolean;
  footer: boolean;
  sidebar: boolean;
  maxWidth?: string;
  containerClass?: string;
}

// Theme Settings
export interface ThemeSettings {
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text?: string;
    textSecondary?: string;
    border?: string;
    success?: string;
    warning?: string;
    error?: string;
  };
  typography: {
    fontFamily?: string;
    headingFontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    fontWeight?: string;
    headingFontWeight?: string;
  };
  spacing: {
    containerPadding?: string;
    sectionPadding?: string;
    elementSpacing?: string;
  };
  effects: {
    borderRadius?: string;
    boxShadow?: string;
    animations?: boolean;
    transitions?: string;
  };
  responsive: {
    breakpoints: {
      mobile: string;
      tablet: string;
      desktop: string;
    };
  };
}

// SEO Settings
export interface SEOSettings {
  canonical?: string;
  robots?: string;
  schema?: Record<string, any>;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
    siteName?: string;
  };
  twitter: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  additionalMeta?: Array<{
    name: string;
    content: string;
    property?: string;
  }>;
}

// Page Settings
export interface PageSettings {
  header: {
    show: boolean;
    transparent?: boolean;
    fixed?: boolean;
    customLogo?: string;
  };
  footer: {
    show: boolean;
    customContent?: string;
  };
  sidebar: {
    show: boolean;
    position: 'left' | 'right';
    width?: string;
  };
  animations: {
    enabled: boolean;
    type: 'fade' | 'slide' | 'zoom' | 'none';
    duration: number;
    delay?: number;
  };
  customCode: {
    headHtml?: string;
    bodyHtml?: string;
    footerHtml?: string;
  };
}

// Enhanced Page Interface
export interface EnhancedPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  isFeatured: boolean;
  template: string;
  contentBlocks: ContentBlock[];
  themeSettings: ThemeSettings;
  seoSettings: SEOSettings;
  pageSettings: PageSettings;
  featuredImageId?: string;
  heroImageId?: string;
  galleryImages: string[];
  customCss?: string;
  customJs?: string;
  viewCount: number;
  readingTime?: number;
  authorId?: string;
  tags: string[];
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

// Page Asset
export interface PageAsset {
  id: string;
  filename: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  altText?: string;
  caption?: string;
  tags: string[];
  metadata: Record<string, any>;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  isOptimized: boolean;
  createdAt: string;
  updatedAt: string;
}

// Editor State
export interface PageEditorState {
  page: EnhancedPage;
  selectedBlockId?: string;
  draggedBlockId?: string;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  isDirty: boolean;
  isPreviewOpen: boolean;
  isPublishing: boolean;
  errors: Record<string, string>;
}

// Block Component Props
export interface BlockComponentProps<T extends ContentBlock = ContentBlock> {
  block: T;
  isEditing: boolean;
  isSelected: boolean;
  onUpdate: (block: T) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

// API Responses
export interface PageBuilderAPI {
  pages: {
    list: (params: PageListParams) => Promise<PaginatedResponse<EnhancedPage>>;
    get: (id: string) => Promise<EnhancedPage>;
    create: (data: Partial<EnhancedPage>) => Promise<EnhancedPage>;
    update: (id: string, data: Partial<EnhancedPage>) => Promise<EnhancedPage>;
    delete: (id: string) => Promise<void>;
    publish: (id: string) => Promise<EnhancedPage>;
    unpublish: (id: string) => Promise<EnhancedPage>;
    duplicate: (id: string) => Promise<EnhancedPage>;
  };
  templates: {
    list: () => Promise<PageTemplate[]>;
    get: (id: string) => Promise<PageTemplate>;
    create: (data: Partial<PageTemplate>) => Promise<PageTemplate>;
    update: (id: string, data: Partial<PageTemplate>) => Promise<PageTemplate>;
    delete: (id: string) => Promise<void>;
  };
  assets: {
    list: (params: AssetListParams) => Promise<PaginatedResponse<PageAsset>>;
    upload: (files: FileList) => Promise<PageAsset[]>;
    delete: (id: string) => Promise<void>;
    optimize: (id: string) => Promise<PageAsset>;
  };
}

export interface PageListParams {
  page?: number;
  limit?: number;
  search?: string;
  template?: string;
  isPublished?: boolean;
  authorId?: string;
  categoryId?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AssetListParams {
  page?: number;
  limit?: number;
  fileType?: string;
  tags?: string[];
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 