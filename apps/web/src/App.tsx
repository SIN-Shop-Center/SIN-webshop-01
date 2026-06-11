/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ============================================================================
 * SIN-SHOP MAIN APPLICATION COMPONENT - REFACTORED
 * ============================================================================
 * 
 * ARCHITECTURE:
 * - ShopProvider: Products, Cart, Wishlist, Orders, Filters, Toast
 * - AuthProvider: User authentication, Supabase Auth state
 * 
 * PAGES:
 * - HomePage: Hero + Products + Filters (Shop tab)
 * - CartPage: Cart + Checkout (Cart tab)
 * - WishlistPage: Wishlist (Wishlist tab)
 * - CustomerDashboard: Account + Orders (Account tab)
 * 
 * OVERLAYS:
 * - CartDrawer: Floating cart drawer
 * - ProductDetailsModal: Product detail view
 * - AuthModal: Login/Register
 * - AuthCallback: Email confirmation handler
 * - TemuLuckyBox: Discount coupon spinner
 * - Notification: Toast notifications
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { ShopProvider, useShop } from "./context/ShopContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CATEGORIES } from "./data";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import CartPage from "./components/CartPage";
import WishlistPage from "./components/WishlistPage";
import CustomerDashboard from "./components/CustomerDashboard";
import CartDrawer from "./components/CartDrawer";
import ProductDetailsModal from "./components/ProductDetailsModal";
import Notification from "./components/Notification";
import AuthModal from "./components/AuthModal";
import AuthCallback from "./components/AuthCallback";
import TemuLuckyBox from "./components/TemuLuckyBox";
import MobileNav from "./components/MobileNav";
import {
  ShieldCheck,
  Heart,
  Mail,
  Sparkles,
  Facebook,
  Instagram,
  Youtube,
  Truck,
  Send,
} from "lucide-react";

// AppContent contains all the actual UI logic
function AppContent() {
  const {
    products,
    cartItems,
    wishlist,
    orders,
    browsingHistory,
    selectedProduct,
    setSelectedProduct,
    toasts,
    isCartOpen,
    setIsCartOpen,
    isCheckoutOpen,
    setIsCheckoutOpen,
    discount,
    setDiscount,
    newsletterEmail,
    setNewsletterEmail,
    newsletterSubscribed,
    setNewsletterSubscribed,
    cartCount,
    wishlistCount,
    showToast,
    handleRemoveToast,
    handleAddToCart,
    handleUpdateQuantity,
    handleRemoveItem,
    handleOrderCompleted,
    handleClearCart,
    handleApplyLuckyDiscount,
    handleAddReview,
    handleViewProduct,
    handleToggleWishlist,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    searchQuery,
    setSearchQuery,
    availableSubcategories,
    subcategoryCounts,
  } = useShop();
  
  const {
    currentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleLogin,
    handleLogout,
    handleToggleUser,
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"shop" | "cart" | "wishlist" | "account">("shop");
  const [showAuthCallback, setShowAuthCallback] = useState(false);
  
  // Countdown timer
  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
    return {
      hours: Math.floor(diff / 3600),
      minutes: Math.floor((diff % 3600) / 60),
      seconds: diff % 60,
    };
  };
  const [countdown, setCountdown] = useState(getTimeUntilMidnight);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Check for auth callback in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('type=signup') || hash.includes('type=recovery')) {
      setShowAuthCallback(true);
    }
  }, []);
  
  // Handle checkout trigger
  const handleCheckoutTrigger = (appliedDiscount: { code: string; percent: number }) => {
    setDiscount(appliedDiscount);
    setIsCartOpen(false);
    setActiveTab("cart");
  };
  
  // Add review wrapper with current user
  const handleAddReviewWithUser = (productId: string, rating: number, comment: string) => {
    handleAddReview(productId, rating, comment, currentUser.name, currentUser.isLoggedIn);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f6f8] pb-16 sm:pb-24 md:pb-0 text-gray-900 font-sans selection:bg-orange-550 selection:text-white">
      {/* SEO Meta Tags */}
      {selectedProduct ? (
        <>
          <title>{`${selectedProduct.title} | Premium Concept Goods & Design | SIN_WEBSHOP`}</title>
          <meta name="description" content={selectedProduct.description} />
        </>
      ) : (
        <>
          <title>SIN_WEBSHOP | Premium Tech, Lifestyle &amp; Home Goods</title>
          <meta name="description" content="Ihr exklusiver Concept-Store für kuratierte Tech-Gadgets, minimalistische Einrichtungsgegenstände und zeitlose Lifestyle-Accessoires mit kompromisslosem Anspruch an Design und Material." />
        </>
      )}
      
      {/* Promo Ticker Header */}
      <div className="w-full bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 py-2 px-4 text-slate-950 font-black text-center flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-5 text-xs shadow-md border-b border-orange-700/60 select-none">
        <div className="flex items-center gap-1.5 justify-center">
          <span className="bg-slate-950 text-orange-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse shrink-0">
            Blitzangebot
          </span>
          <span className="font-black text-[11px] text-slate-950">
            Rabatte von bis zu 80% + Kostenloser Versand auf ALLES heute!
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-950 font-bold justify-center shrink-0">
          <span>Gutscheincode: </span>
          <span className="font-mono bg-slate-950 text-white px-2 py-0.5 rounded font-black text-[10px] select-all border border-slate-900/40">
            BLITZ80
          </span>
          <div className="h-3 w-px bg-slate-950/20 hidden md:block" />
          <span className="flex items-center gap-1 font-mono font-black text-rose-950">
            ⏰ Endet in: {String(countdown.hours).padStart(2, "0")}:
            {String(countdown.minutes).padStart(2, "0")}:
            {String(countdown.seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Dynamic Glow Accents */}
      <div className="pointer-events-none fixed top-0 left-1/2 -z-30 h-100 w-200 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl"></div>

      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onCartToggle={() => setActiveTab("cart")}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        onToggleUser={handleToggleUser}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSubcategory={selectedSubcategory}
        setSelectedSubcategory={setSelectedSubcategory}
        availableSubcategories={availableSubcategories}
        categories={CATEGORIES}
        subcategoryCounts={subcategoryCounts}
      />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:py-6 sm:px-6 lg:px-8 lg:py-8">
        {activeTab === "shop" && <HomePage />}
        {activeTab === "cart" && (
          <CartPage
            cartItems={cartItems}
            products={products}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onOrderCompleted={handleOrderCompleted}
            onBackToShop={() => setActiveTab("shop")}
          />
        )}
        {activeTab === "wishlist" && <WishlistPage setActiveTab={setActiveTab} />}
        {activeTab === "account" && (
          <CustomerDashboard
            orders={orders}
            currentUser={currentUser}
            wishlistCount={wishlistCount}
            onUpdateProfile={(updatedUser) => {
              // Handle profile update
              showToast("Profil aktualisiert!", "success");
            }}
            onAddToCart={handleAddToCart}
            onNavigateToShop={() => setActiveTab("shop")}
            onOpenCart={() => setActiveTab("cart")}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <Footer showToast={showToast} />

      {/* Overlays */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckoutTrigger}
      />

      <ProductDetailsModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        allProducts={products}
        browsingHistory={browsingHistory}
        currentUser={currentUser}
        onToggleUser={handleToggleUser}
        onAddReview={handleAddReviewWithUser}
        onViewProduct={handleViewProduct}
      />

      <Notification toasts={toasts} onRemoveToast={handleRemoveToast} />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {showAuthCallback && (
        <AuthCallback onAuthComplete={() => setShowAuthCallback(false)} />
      )}

      <TemuLuckyBox onApplyDiscount={handleApplyLuckyDiscount} />

      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onCartToggle={() => setActiveTab("cart")}
      />
    </div>
  );
}

// Footer component extracted
function Footer({ showToast }: { showToast: (text: string, type?: "success" | "info" | "error") => void }) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white pt-10 pb-8 text-xs text-gray-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Trust badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-8 border-b border-gray-150">
          <TrustBadge icon={<Truck className="h-6 w-6" />} title="Gratis Premium-Versand" desc="Kostenfrei ab 50 € in ganz EU" />
          <TrustBadge icon={<ShieldCheck className="h-6 w-6" />} title="100% Sicherer Check-out" desc="Verschlüsselte SSL-Sicherheit" />
          <TrustBadge icon={<Sparkles className="h-6 w-6" />} title="Zufriedenheitsgarantie" desc="30 Tage Rückgaberecht / Umtausch" />
          <TrustBadge icon={<Mail className="h-6 w-6" />} title="24/7 Premium-Support" desc="Schnelle Hilfe per Mail &amp; Chat" />
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Store Intro */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-transparent bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-lg tracking-tight">
                SIN_WEBSHOP
              </span>
              <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Est. 2026
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Ihr exklusiver Concept-Store für kuratierte Tech-Gadgets, minimalistische Einrichtungsgegenstände und zeitlose Lifestyle-Accessoires mit kompromisslosem Anspruch an Design und Material.
            </p>
            <div className="space-y-2 pt-2">
              <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Social Media</span>
              <div className="flex gap-2.5">
                <SocialButton icon={<Instagram className="h-4 w-4" />} onClick={() => showToast("Folgen Sie uns auf Instagram für Insights!", "info")} />
                <SocialButton icon={<Facebook className="h-4 w-4" />} onClick={() => showToast("Werden Sie Teil unserer Facebook-Community!", "info")} />
                <SocialButton icon={<Youtube className="h-4 w-4" />} onClick={() => showToast("Sehen Sie unsere Reviews auf YouTube!", "info")} />
              </div>
            </div>
          </div>

          {/* Categories */}
          <FooterColumn title="Kategorien">
            <FooterLink onClick={() => {}}>Alle Produkte</FooterLink>
            <FooterLink onClick={() => {}}>Tech &amp; Gadgets</FooterLink>
            <FooterLink onClick={() => {}}>Lifestyle &amp; Accessoires</FooterLink>
            <FooterLink onClick={() => {}}>Home &amp; Living</FooterLink>
          </FooterColumn>

          {/* Help & Service */}
          <FooterColumn title="Hilfe &amp; Service">
            <FooterLink onClick={() => showToast("Kundenkonto & Bestellverlauf", "info")}>Kundenkonto &amp; Bestellverlauf</FooterLink>
            <FooterLink onClick={() => showToast("Sichere SSL-Bezahlung über Stripe, PayPal, Klarna und Sofortüberweisung ist standardmäßig aktiv.", "info")}>Zahlungsarten &amp; Sicherheit</FooterLink>
            <FooterLink onClick={() => showToast("EU-Premium-Versand mit Sendungsverfolgung. Lieferdauer 1-3 Werktage. DHL Express zubuchbar.", "info")}>Versand &amp; Sendungsverfolgung</FooterLink>
            <FooterLink onClick={() => showToast("Unser Support steht Ihnen rund um die Uhr zur Verfügung! Schreiben Sie uns an: support@sin-webshop.de", "info")}>Kontakt &amp; Supportanfragen</FooterLink>
          </FooterColumn>

          {/* Newsletter */}
          <FooterColumn title="Newsletter">
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Melden Sie sich an und erhalten Sie sofort einen <strong className="text-orange-600">10% Gutscheincode</strong> für Ihre nächste Bestellung sowie Zugang zu exklusiven Produktlaunches.
            </p>
            {!newsletterSubscribed ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newsletterEmail.trim()) {
                    setNewsletterSubscribed(true);
                    showToast("Newsletter erfolgreich abonniert! Gutschein 'SINNEW10' wurde in die Zwischenablage kopiert.", "success");
                    try {
                      navigator.clipboard.writeText("SINNEW10");
                    } catch (err) {
                      console.error("Clipboard copy failed", err);
                    }
                  }
                }}
                className="flex gap-2"
              >
                <div className="relative flex-grow">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Ihre E-Mail..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 py-2.5 text-xs font-bold text-gray-900 outline-hidden focus:border-orange-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/10 cursor-pointer"
                  title="Abonnieren"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 space-y-2 text-center">
                <span className="block text-xs font-black text-orange-600">Abonnement erfolgreich! 🎉</span>
                <div className="flex flex-col items-center gap-1 bg-white border border-dashed border-orange-200 rounded-xl p-2">
                  <span className="text-[10px] text-gray-450 font-black tracking-widest uppercase">Ihr Rabattcode</span>
                  <strong className="text-sm font-mono font-black text-gray-950 select-all tracking-wider">SINNEW10</strong>
                </div>
                <p className="text-[10px] text-gray-500 font-semibold">-10% Coupon in Zwischenablage kopiert &amp; bereit für Check-out.</p>
              </div>
            )}
          </FooterColumn>
        </div>

        {/* Divider and Footer Meta */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-gray-150 text-[10px] font-semibold text-gray-400">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center md:justify-start">
            <span>© {new Date().getFullYear()} SIN_WEBSHOP Concept Goods. Alle Rechte vorbehalten.</span>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 bg-gray-200 rounded-full" />
              <button type="button" onClick={() => showToast("Das Impressum wird derzeit überarbeitet und in Kürze veröffentlicht.", "info")} className="hover:text-gray-600 transition-colors cursor-pointer">Impressum</button>
              <span className="h-1 w-1 bg-gray-200 rounded-full" />
              <button type="button" onClick={() => showToast("Die Datenschutzerklärung wird derzeit überarbeitet und in Kürze veröffentlicht.", "info")} className="hover:text-gray-600 transition-colors cursor-pointer">Datenschutz</button>
              <span className="h-1 w-1 bg-gray-200 rounded-full" />
              <button type="button" onClick={() => showToast("Die AGB werden derzeit überarbeitet und in Kürze veröffentlicht.", "info")} className="hover:text-gray-600 transition-colors cursor-pointer">Allgemeine Geschäftsbedingungen</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest text-gray-300 mr-1 hidden sm:inline">PAYMENT METHODS</span>
            <span className="font-mono text-[8.5px] tracking-wider text-gray-500 font-extrabold border border-gray-200 px-1.5 py-0.5 rounded-md bg-white">VISA</span>
            <span className="font-mono text-[8.5px] tracking-wider text-gray-500 font-extrabold border border-gray-200 px-1.5 py-0.5 rounded-md bg-white">MC</span>
            <span className="font-mono text-[8.5px] tracking-wider text-gray-500 font-extrabold border border-gray-200 px-1.5 py-0.5 rounded-md bg-white">AMEX</span>
            <span className="font-mono text-[8.5px] tracking-wider text-gray-500 font-extrabold border border-gray-200 px-1.5 py-0.5 rounded-md bg-white">PAYPAL</span>
            <span className="font-mono text-[8.5px] tracking-wider text-gray-500 font-extrabold border border-gray-200 px-1.5 py-0.5 rounded-md bg-white">KLARNA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Footer sub-components
function TrustBadge({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-black text-gray-900">{title}</h4>
        <p className="text-[11px] text-gray-400 font-bold">{desc}</p>
      </div>
    </div>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-900 border-b border-gray-150 pb-2">{title}</h3>
      <ul className="space-y-2.5 font-bold text-gray-600 font-sans">
        {children}
      </ul>
    </div>
  );
}

function FooterLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <li>
      <button onClick={onClick} className="hover:text-orange-600 hover:underline transition-colors cursor-pointer text-left">
        {children}
      </button>
    </li>
  );
}

function SocialButton({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all cursor-pointer">
      {icon}
    </button>
  );
}

// Main App with Providers
export default function App() {
  return (
    <ShopProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ShopProvider>
  );
}
