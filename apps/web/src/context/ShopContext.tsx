/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase/client";
import { Product, CartItem, Order, Review, ToastMessage } from "../types";

export interface ShopContextType {
  // Products
  products: Product[];
  loading: boolean;
  productsError: string | null;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  
  // Cart
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  isCartOpen: boolean;
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Wishlist
  wishlist: string[];
  setWishlist: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Orders
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  
  // Browsing History
  browsingHistory: string[];
  setBrowsingHistory: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Filters
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  selectedSubcategory: string;
  setSelectedSubcategory: React.Dispatch<React.SetStateAction<string>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  
  // Selected Product
  selectedProduct: Product | null;
  setSelectedProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  
  // Toasts
  toasts: ToastMessage[];
  setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>>;
  
  // Discount
  discount: { code: string; percent: number };
  setDiscount: React.Dispatch<React.SetStateAction<{ code: string; percent: number }>>;
  
  // Newsletter
  newsletterEmail: string;
  setNewsletterEmail: React.Dispatch<React.SetStateAction<string>>;
  newsletterSubscribed: boolean;
  setNewsletterSubscribed: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Computed
  filteredProducts: Product[];
  availableSubcategories: string[];
  subcategoryCounts: Record<string, number>;
  cartCount: number;
  wishlistCount: number;
  
  // Actions
  showToast: (text: string, type?: "success" | "info" | "error") => void;
  handleRemoveToast: (id: string) => void;
  handleToggleWishlist: (productId: string) => void;
  handleAddToCart: (product: Product, quantity?: number, selectedColor?: string, selectedSize?: string) => void;
  handleUpdateQuantity: (productId: string, quantity: number, selectedColor?: string, selectedSize?: string) => void;
  handleRemoveItem: (productId: string, selectedColor?: string, selectedSize?: string) => void;
  handleOrderCompleted: (completedOrder: Order) => void;
  handleClearCart: () => void;
  handleApplyLuckyDiscount: (code: string, percent: number) => void;
  handleAddReview: (productId: string, rating: number, comment: string, currentUserName: string, currentUserIsLoggedIn: boolean) => void;
  handleViewProduct: (product: Product | null) => void;
}

export const ShopContext = createContext<ShopContextType | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  
  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("sin_shop_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem("sin_shop_wishlist");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem("sin_shop_orders");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Browsing History
  const [browsingHistory, setBrowsingHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("sin_shop_history");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All Subcategories");
  const [sortBy, setSortBy] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected Product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Discount
  const [discount, setDiscount] = useState<{ code: string; percent: number }>({
    code: "",
    percent: 0,
  });
  
  // Newsletter
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  
  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("public.products")
          .select("metadata,\n              categories (name, slug),\n              suppliers (name)")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching products:", error);
          setProductsError("Fehler beim Laden der Produkte");
          return;
        }

        const transformedProducts: Product[] = data.map((supabaseProduct: any) => {
          const metadata = supabaseProduct.metadata as any || {};
          
          let images: string[] = [];
          let imageUrl = "";
          if (typeof supabaseProduct.images === "string") {
            try {
              images = JSON.parse(supabaseProduct.images);
              imageUrl = images && images.length > 0 ? images[0] : "";
            } catch {
              images = [];
            }
          } else if (Array.isArray(supabaseProduct.images)) {
            images = supabaseProduct.images;
            imageUrl = images && images.length > 0 ? images[0] : "";
          }

          let colors: string[] = [];
          let sizes: string[] = [];
          if (typeof supabaseProduct.variants === "string") {
            try {
              const variants = JSON.parse(supabaseProduct.variants);
              colors = variants.colors || [];
              sizes = variants.sizes || [];
            } catch {}
          } else if (supabaseProduct.variants && typeof supabaseProduct.variants === "object") {
            const variants = supabaseProduct.variants as any;
            colors = variants.colors || [];
            sizes = variants.sizes || [];
          }

          return {
            id: supabaseProduct.id,
            title: supabaseProduct.name,
            description: supabaseProduct.description || "",
            price: Number(supabaseProduct.price || 0),
            originalPrice: supabaseProduct.original_price ? Number(supabaseProduct.original_price) : undefined,
            rating: metadata.rating || 0,
            ratingCount: metadata.ratingCount || 0,
            category: metadata.category_id === "00000000-0000-0000-0000-000000000001" ? "Tech & Gadgets" :
                     metadata.category_id === "00000000-0000-0000-0000-000000000002" ? "Lifestyle & Accessories" :
                     metadata.category_id === "00000000-0000-0000-0000-000000000003" ? "Home & Living" : "All Products",
            subcategory: metadata.category_id === "00000000-0000-0000-0000-000000000001" ? "Tech & Gadgets" :
                       metadata.category_id === "00000000-0000-0000-0000-000000000002" ? "Lifestyle & Accessories" :
                       metadata.category_id === "00000000-0000-0000-0000-000000000003" ? "Home & Living" : "",
            imageUrl,
            imageGallery: images,
            stock: supabaseProduct.stock || 0,
            isFeatured: metadata.is_featured || false,
            colors,
            sizes,
            features: metadata.features || [],
            specifications: metadata.specifications || {},
          };
        });

        setProducts(transformedProducts);
        setProductsError(null);
      } catch (error) {
        console.error("Unexpected error fetching products:", error);
        setProductsError("Unerwarteter Fehler beim Laden der Produkte");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);
  
  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("sin_shop_cart", JSON.stringify(cartItems));
  }, [cartItems]);
  
  useEffect(() => {
    localStorage.setItem("sin_shop_history", JSON.stringify(browsingHistory));
  }, [browsingHistory]);
  
  useEffect(() => {
    localStorage.setItem("sin_shop_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);
  
  useEffect(() => {
    localStorage.setItem("sin_shop_orders", JSON.stringify(orders));
  }, [orders]);
  
  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory("All Subcategories");
  }, [selectedCategory]);
  
  // Toasts
  const showToast = useCallback((
    text: string,
    type: "success" | "info" | "error" = "success",
  ) => {
    const freshToast: ToastMessage = {
      id: `toast-${Date.now()}`,
      text,
      type,
    };
    setToasts((prev) => [...prev, freshToast]);
  }, []);
  
  const handleRemoveToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  
  // Wishlist
  const handleToggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) => {
      const isWished = prev.includes(productId);
      if (isWished) {
        showToast("Von der Wunschliste entfernt", "info");
        return prev.filter((id) => id !== productId);
      } else {
        showToast("Zur Wunschliste hinzugefuegt", "success");
        return [...prev, productId];
      }
    });
  }, [showToast]);
  
  // Cart
  const handleAddToCart = useCallback((
    product: Product,
    quantity = 1,
    selectedColor?: string,
    selectedSize?: string,
  ) => {
    if (product.stock === 0) {
      showToast("Dieses Produkt ist ausverkauft!", "error");
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize,
      );
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(
            `Verzeihung, nur ${product.stock} Stueck auf Lager!`,
            "info",
          );
          return prev;
        }
        showToast(
          `${product.title} wurde aktualisiert (${existing.quantity + quantity} Stk.)`,
          "success",
        );
        return prev.map((item) =>
          item.product.id === product.id &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      showToast(`${product.title} in den Warenkorb gelegt`, "success");
      return [...prev, { product, quantity, selectedColor, selectedSize }];
    });
  }, [showToast]);
  
  const handleUpdateQuantity = useCallback((
    productId: string,
    quantity: number,
    selectedColor?: string,
    selectedSize?: string,
  ) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    if (quantity > targetProduct.stock) {
      showToast(
        `Derzeit sind nur maximal ${targetProduct.stock} Stueck lieferbar`,
        "info",
      );
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId &&
        item.selectedColor === selectedColor &&
        item.selectedSize === selectedSize
          ? { ...item, quantity }
          : item,
      ),
    );
  }, [products, showToast]);
  
  const handleRemoveItem = useCallback((
    productId: string,
    selectedColor?: string,
    selectedSize?: string,
  ) => {
    const target = cartItems.find(
      (item) =>
        item.product.id === productId &&
        item.selectedColor === selectedColor &&
        item.selectedSize === selectedSize,
    );
    if (!target) return;
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedColor === selectedColor &&
            item.selectedSize === selectedSize
          ),
      ),
    );
    showToast(`${target.product.title} wurde entfernt.`, "info");
  }, [cartItems, showToast]);
  
  // Order
  const handleOrderCompleted = useCallback((completedOrder: Order) => {
    setProducts((prevProducts) => {
      return prevProducts.map((p) => {
        const cartMatch = cartItems.find((it) => it.product.id === p.id);
        if (cartMatch) {
          const freshStock = Math.max(0, p.stock - cartMatch.quantity);
          return { ...p, stock: freshStock };
        }
        return p;
      });
    });

    setOrders((prev) => [completedOrder, ...prev]);
    showToast(`Bestellung ${completedOrder.id} erfolgreich uebermittelt!`, "success");
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  }, [cartItems, showToast]);
  
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setDiscount({ code: "", percent: 0 });
  }, []);
  
  const handleApplyLuckyDiscount = useCallback((code: string, percent: number) => {
    setDiscount({ code, percent });
    showToast(
      `Gutschein "${code}" (-${percent}%) erfolgreich an der Kasse aktiviert!`,
      "success",
    );
  }, [showToast]);
  
  // Review
  const handleAddReview = useCallback((
    productId: string,
    rating: number,
    comment: string,
    currentUserName: string,
    currentUserIsLoggedIn: boolean,
  ) => {
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      userName: currentUserIsLoggedIn
        ? currentUserName
        : "Anonymer Gastkunde",
      rating,
      comment,
      date: new Date().toLocaleDateString("de-DE"),
      isRegistered: currentUserIsLoggedIn,
    };

    setProducts((prevProducts) => {
      return prevProducts.map((p) => {
        if (p.id === productId) {
          const currentReviews = p.reviews || [];
          const updatedReviews = [...currentReviews, newReview];
          const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
          const newAvg = Number((totalRating / updatedReviews.length).toFixed(1));

          return {
            ...p,
            rating: newAvg,
            ratingCount: updatedReviews.length,
            reviews: updatedReviews,
          };
        }
        return p;
      });
    });

    setSelectedProduct((prev) => {
      if (prev && prev.id === productId) {
        const currentReviews = prev.reviews || [];
        const updatedReviews = [...currentReviews, newReview];
        const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
        const newAvg = Number((totalRating / updatedReviews.length).toFixed(1));
        return {
          ...prev,
          rating: newAvg,
          ratingCount: updatedReviews.length,
          reviews: updatedReviews,
        };
      }
      return prev;
    });

    showToast("Ihre Bewertung wurde erfolgreich uebermittelt!", "success");
  }, [showToast]);
  
  // View Product
  const handleViewProduct = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      setBrowsingHistory((prev) => {
        const filtered = prev.filter((id) => id !== product.id);
        return [product.id, ...filtered].slice(0, 8);
      });
    }
  }, []);
  
  // Filtered products
  const getFilteredAndSortedProducts = useCallback(() => {
    const filtered = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All Products" ||
        product.category === selectedCategory;
      const matchesSubcategory =
        selectedSubcategory === "All Subcategories" ||
        product.subcategory === selectedSubcategory;
      const matchesSearch =
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSubcategory && matchesSearch;
    });

    if (sortBy === "price-asc") {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price-desc") {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    if (sortBy === "rating-desc") {
      return [...filtered].sort((a, b) => b.rating - a.rating);
    }

    return filtered;
  }, [products, selectedCategory, selectedSubcategory, searchQuery, sortBy]);
  
  const filteredProducts = useMemo(() => getFilteredAndSortedProducts(), [getFilteredAndSortedProducts]);
  
  const availableSubcategories = useMemo(() => {
    const subs = products
      .filter((p) => selectedCategory === "All Products" || p.category === selectedCategory)
      .map((p) => p.subcategory)
      .filter((sub): sub is string => !!sub);
    return ["All Subcategories", ...Array.from(new Set(subs))];
  }, [products, selectedCategory]);
  
  const subcategoryCounts = useMemo(() => {
    return products
      .filter((p) => selectedCategory === "All Products" || p.category === selectedCategory)
      .reduce((acc, p) => {
        if (p.subcategory) {
          acc[p.subcategory] = (acc[p.subcategory] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
  }, [products, selectedCategory]);
  
  const cartCount = useMemo(() => cartItems.reduce((acc, item) => acc + item.quantity, 0), [cartItems]);
  const wishlistCount = useMemo(() => wishlist.length, [wishlist]);
  
  const value: ShopContextType = {
    products, loading, productsError, setProducts,
    cartItems, setCartItems, isCartOpen, setIsCartOpen, isCheckoutOpen, setIsCheckoutOpen,
    wishlist, setWishlist,
    orders, setOrders,
    browsingHistory, setBrowsingHistory,
    selectedCategory, setSelectedCategory,
    selectedSubcategory, setSelectedSubcategory,
    sortBy, setSortBy,
    searchQuery, setSearchQuery,
    selectedProduct, setSelectedProduct,
    toasts, setToasts,
    discount, setDiscount,
    newsletterEmail, setNewsletterEmail,
    newsletterSubscribed, setNewsletterSubscribed,
    filteredProducts,
    availableSubcategories,
    subcategoryCounts,
    cartCount,
    wishlistCount,
    showToast,
    handleRemoveToast,
    handleToggleWishlist,
    handleAddToCart,
    handleUpdateQuantity,
    handleRemoveItem,
    handleOrderCompleted,
    handleClearCart,
    handleApplyLuckyDiscount,
    handleAddReview,
    handleViewProduct,
  };
  
  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}
