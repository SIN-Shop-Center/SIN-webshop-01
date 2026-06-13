import {NextIntlClientProvider, hasLocale} from 'next-intl'
import {getMessages} from 'next-intl/server'
import {notFound} from 'next/navigation'
import {routing} from '@/i18n/routing'
import {setRequestLocale} from 'next-intl/server'
import {Navbar} from '../components/Navbar'
import {CategoryNav} from '../components/category-nav'
import {CookieConsent} from '../components/cookie-consent'
import {Footer} from '../components/Footer'
import {AnnouncementBar} from '@/components/conversion/announcement-bar'
import {ExitIntentOffer} from '@/components/conversion/exit-intent-offer'
import {MobileTabBar} from '@/components/mobile-tab-bar'
import {NewsletterCapture} from '@/components/conversion/newsletter-capture'
import {FloatingRatingBadge} from '@/components/floating-rating-badge'
import {UspTopbar} from '@/components/usp-topbar'
import {FloatingTrustBadge} from '@/components/floating-trust-badge'

type Props = {
  children: React.ReactNode
  params: Promise<{locale: string}>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}))
}

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <UspTopbar />
      <AnnouncementBar />
      <Navbar />
      <CategoryNav />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <CookieConsent />
      <ExitIntentOffer />
      <NewsletterCapture />
      <MobileTabBar />
      <FloatingRatingBadge />
      <FloatingTrustBadge count={0} />
    </NextIntlClientProvider>
  )
}
