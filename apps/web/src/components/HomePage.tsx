/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Store } from "lucide-react";
import { useShop } from "../context/ShopContext";
import { useAuth } from "../context/AuthContext";
import Hero from "./Hero";
import ProductCard from "./ProductCard";

export default function HomePage() {
  const {
    products,
    loading,
    productsError,
    filteredProducts,
    availableSubcategories,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    sortBy,
    setSortBy,
    searchQuery,
    cartItems,
    wishlist,
    handleToggleWishlist,
    handleAddToCart,
    handleViewProduct,
    showToast,
  } = useShop();
  
  const { currentUser } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        <p className="mt-4 text-gray-600">Produkte werden aus Supabase geladen...</p>
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-red-500 text-lg mb-2">❌ Fehler beim Laden der Produkte</div>
        <p className="text-gray-600 mb-4">{productsError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-orange-600"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <Hero
        products={products}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onAddToCart={handleAddToCart}
        onViewDetails={handleViewProduct}
        onApplyDiscount={(code, percent) => {
          showToast(`Gutschein "${code}" (-${percent}%) aktiviert!`, "success");
        }}
      />

      {/* Mobile Quick-Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:hidden px-1 -mx-1 scrollbar-hide">
        {["All Products", "Tech & Gadgets", "Lifestyle & Accessories", "Home & Living"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"
            }`}
          >
            {cat === "All Products" ? "Alle" : cat}
          </button>
        ))}
      </div>

      {/* Shop Section */}
      <div id="products-explore" className="scroll-mt-24 space-y-4">
        {/* Category Filter Title */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-gray-150 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-black text-[#ef5006] uppercase tracking-wider border border-orange-100">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-600 animate-ping"></span>
              <span>⚡ LIVE-BESTAENDE BEGRENZT</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight leading-none">
              {selectedCategory === "All Products"
                ? "Alle Angebote"
                : selectedCategory}{" "}
              <span className="text-gray-400 font-medium text-xs sm:text-sm">
                ({filteredProducts.length} Artikel gefunden)
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* Dynamic subcategory filter dropdown */}
            {availableSubcategories.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-150 rounded-xl px-2.5 py-1.5 shadow-xs">
                <label
                  htmlFor="product-subcategory"
                  className="text-[10px] sm:text-[11px] font-black uppercase text-gray-450 tracking-wider whitespace-nowrap"
                >
                  Typ/Sub:
                </label>
                <select
                  id="product-subcategory"
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="bg-transparent text-gray-800 text-xs font-bold focus:outline-none cursor-pointer pr-1"
                >
                  {availableSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub === "All Subcategories" ? "Alle Typen" : sub}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sorting dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-150 rounded-xl px-2.5 py-1.5 shadow-xs">
              <label
                htmlFor="product-sort"
                className="text-[10px] sm:text-[11px] font-black uppercase text-gray-450 tracking-wider"
              >
                Sortieren:
              </label>
              <select
                id="product-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-gray-800 text-xs font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="default">Standard-Angebote</option>
                <option value="price-asc">Preis: Niedrig zu Hoch</option>
                <option value="price-desc">Preis: Hoch zu Niedrig</option>
                <option value="rating-desc">Beliebteste (Sterne)</option>
              </select>
            </div>

            <div className="text-[10px] sm:text-[11px] text-gray-550 font-bold bg-gray-50 border border-gray-150 rounded-xl px-3 py-1.5">
              ⚡ Preise gelten nur fuer kurze Zeit &amp; solange der Vorrat
              reicht!
            </div>
          </div>
        </div>

        {/* Grid of Product Cards */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWished={wishlist.includes(product.id)}
                onToggleWishlist={handleToggleWishlist}
                onAddToCart={handleAddToCart}
                onViewDetails={handleViewProduct}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 text-center space-y-3 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-400">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800">
              Keine Produkte gefunden
            </h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Fuer &quot;{searchQuery}&quot; in der Kategorie &quot;{selectedCategory}&quot;
              konnten wir leider kein Produkt finden. Versuchen Sie es mit
              anderen Begriffen.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All Products");
              }}
              className="mt-2 text-xs font-bold text-orange-500 hover:underline"
            >
              Filter zuruecksetzen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
