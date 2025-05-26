export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active?: boolean;
  position?: number;
}

export interface CategoryUpdateInput {
  name?: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active?: boolean;
  position?: number;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
} 