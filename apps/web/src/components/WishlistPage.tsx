/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { useShop } from "../context/ShopContext";
import ProductCard from "./ProductCard";

interface WishlistPageProps {
  setActiveTab: (tab: "shop" | "cart" | "wishlist" | "account") => void;
}

export default function WishlistPage({ setActiveTab }: WishlistPageProps) {
  const {
    products,
    wishlist,
    handleToggleWishlist,
    handleAddToCart,
    handleViewProduct,
  } = useShop();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="border-b border-gray-150 pb-4">
        <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
          <Heart className="h-6 w-6 fill-orange-500 text-orange-500" />{" "}
          Meine Wunschliste
        </h2>
      </div>

      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {products
            .filter((p) => wishlist.includes(p.id))
            .map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWished={true}
                onToggleWishlist={handleToggleWishlist}
                onAddToCart={handleAddToCart}
                onViewDetails={handleViewProduct}
              />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 text-center space-y-3 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 border border-orange-100 text-orange-500">
            <Heart className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-gray-800">
            Ihre Wunschliste ist leer
          </h3>
          <p className="text-xs text-gray-500 max-w-sm">
            Klicken Sie auf das Herzsymbol eines Produkts, um es fuer
            spaeter zu speichern.
          </p>
          <button
            onClick={() => setActiveTab("shop")}
            className="mt-4 rounded-xl bg-gray-900 px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-gray-800"
          >
            Produkte entdecken
          </button>
        </div>
      )}
    </motion.div>
  );
}
