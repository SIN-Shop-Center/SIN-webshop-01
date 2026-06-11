/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./client";
import type { Product } from "../../types";

export type SupabaseProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  images: string | string[];
  variants: any;
  stock: number;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
};

export type DbCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export async function fetchActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("public.products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as any[]).map(transformProduct);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("public.products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return transformProduct(data as any);
}

export async function fetchCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from("public.categories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data as DbCategory[];
}

export async function dbHealthCheck(): Promise<{
  ok: boolean;
  productCount: number;
  categoryCount: number;
  error?: string;
}> {
  try {
    const [products, categories] = await Promise.all([
      supabase.from("public.products").select("id", { count: "exact", head: true }),
      supabase.from("public.categories").select("id", { count: "exact", head: true }),
    ]);

    if (products.error) throw products.error;
    if (categories.error) throw categories.error;

    return {
      ok: true,
      productCount: products.count || 0,
      categoryCount: categories.count || 0,
    };
  } catch (error: any) {
    return {
      ok: false,
      productCount: 0,
      categoryCount: 0,
      error: error.message,
    };
  }
}

export function transformProduct(sp: SupabaseProduct): Product {
  const metadata = sp.metadata || {};

  let images: string[] = [];
  let imageUrl = "";
  if (typeof sp.images === "string") {
    try {
      images = JSON.parse(sp.images);
    } catch {
      images = [];
    }
  } else if (Array.isArray(sp.images)) {
    images = sp.images;
  }
  imageUrl = images.length > 0 ? images[0] : "";

  let colors: string[] = [];
  let sizes: string[] = [];
  if (sp.variants) {
    if (typeof sp.variants === "string") {
      try {
        const v = JSON.parse(sp.variants);
        colors = v.colors || [];
        sizes = v.sizes || [];
      } catch {}
    } else {
      colors = sp.variants.colors || [];
      sizes = sp.variants.sizes || [];
    }
  }

  return {
    id: sp.id,
    title: sp.name,
    description: sp.description || "",
    price: Number(sp.price || 0),
    originalPrice: sp.original_price ? Number(sp.original_price) : undefined,
    rating: metadata.rating || 0,
    ratingCount: metadata.ratingCount || 0,
    category: metadata.category_id === "00000000-0000-0000-0000-000000000001"
        ? "Tech & Gadgets"
        : metadata.category_id === "00000000-0000-0000-0000-000000000002"
        ? "Lifestyle & Accessories"
        : metadata.category_id === "00000000-0000-0000-0000-000000000003"
        ? "Home & Living"
        : "All Products",
    subcategory: metadata.category_id === "00000000-0000-0000-0000-000000000001"
        ? "Tech & Gadgets"
        : metadata.category_id === "00000000-0000-0000-0000-000000000002"
        ? "Lifestyle & Accessories"
        : metadata.category_id === "00000000-0000-0000-0000-000000000003"
        ? "Home & Living"
        : "",
    imageUrl,
    imageGallery: images,
    stock: sp.stock || 0,
    isFeatured: metadata.is_featured || false,
    colors,
    sizes,
    features: metadata.features || [],
    specifications: metadata.specifications || {},
  };
}
