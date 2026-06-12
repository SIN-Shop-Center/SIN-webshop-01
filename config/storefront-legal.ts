export const STOREFRONT_LEGAL_CONTACT = {
  companyName: 'ShopSIN',
  ownerName: 'Jeremy Schulze',
  address: 'Kurfürstenstraße 124, 10785 Berlin, Deutschland',
  legalEmail: 'opensin@gmx.com',
  contactEmail: 'kontakt@delqhi.com', // primärer Kundenkontakt (Resend-verifizierte Domain)
  shopDomain: 'delqhi.com',
  legalPhone: '', // KI-Telefonassistent folgt — vorerst keine Nummer
  // Zweiter schneller Kontaktweg gem. § 5 DDG: /kontakt-Formular
  contactFormUrl: '/kontakt',
}

export const STOREFRONT_LEGAL_LINKS = [
  { label: 'Impressum', href: '/impressum' },
  { label: 'Datenschutz', href: '/datenschutz' },
  { label: 'AGB', href: '/agb' },
  { label: 'Widerruf', href: '/widerrufsrecht' },
  { label: 'Versand', href: '/versand' },
]

export const STOREFRONT_FOOTER_LEGAL_NOTE =
  'Alle Preise inkl. MwSt. Versand innerhalb Deutschlands. Widerrufsrecht: 14 Tage.'

export interface StorefrontLegalSection {
  title: string
  body: string
}

export interface StorefrontLegalPage {
  path: string
  title: string
  description: string
  intro: string
  sections?: StorefrontLegalSection[]
  disclaimer?: string
}

export const STOREFRONT_LEGAL_PAGES: Record<string, StorefrontLegalPage> = {
  impressum: {
    path: '/impressum',
    title: 'Impressum',
    description: 'Anbieterkennzeichnung gemaess § 5 TMG fuer ShopSIN.',
    intro: 'Angaben gemaess § 5 Telemediengesetz (TMG).',
    sections: [
      {
        title: 'Angaben gemäß § 5 TMG',
        body: `${STOREFRONT_LEGAL_CONTACT.companyName}\n${STOREFRONT_LEGAL_CONTACT.ownerName}\n${STOREFRONT_LEGAL_CONTACT.address}`,
      },
      {
        title: 'Kontakt',
        body: `E-Mail: ${STOREFRONT_LEGAL_CONTACT.legalEmail}\nKontaktformular: ${STOREFRONT_LEGAL_CONTACT.shopDomain}${STOREFRONT_LEGAL_CONTACT.contactFormUrl}\nTelefon: ${STOREFRONT_LEGAL_CONTACT.legalPhone || 'wird derzeit eingerichtet (KI-Telefonassistent in Vorbereitung)'}`,
      },
      {
        title: 'Umsatzsteuer-ID',
        body: 'USt-IdNr. wird beantragt — gilt als Kleinunternehmer gem. § 19 UStG, sofern nicht abweichend vermerkt.',
      },
      {
        title: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
        body: `${STOREFRONT_LEGAL_CONTACT.ownerName}, Anschrift wie oben.`,
      },
    ],
  },
  datenschutz: {
    path: '/datenschutz',
    title: 'Datenschutzerklaerung',
    description: 'Informationen zur Verarbeitung personenbezogener Daten gemaess DSGVO bei ShopSIN.',
    intro: 'Wir nehmen den Schutz deiner personenbezogenen Daten ernst. Nachfolgend erlaeutern wir, welche Daten wir erheben, wie wir sie verwenden und welche Rechte du hast.',
    sections: [
      {
        title: '1. Verantwortlicher',
        body: `Verantwortlicher fuer die Datenverarbeitung ist:\n\n${STOREFRONT_LEGAL_CONTACT.companyName}\n${STOREFRONT_LEGAL_CONTACT.ownerName}\n${STOREFRONT_LEGAL_CONTACT.address}\nE-Mail: ${STOREFRONT_LEGAL_CONTACT.legalEmail}\nKontaktformular: ${STOREFRONT_LEGAL_CONTACT.shopDomain}${STOREFRONT_LEGAL_CONTACT.contactFormUrl}\nTelefon: ${STOREFRONT_LEGAL_CONTACT.legalPhone || 'wird derzeit eingerichtet (KI-Telefonassistent in Vorbereitung)'}`,
      },
      {
        title: '2. Erhebung und Speicherung personenbezogener Daten',
        body: 'Beim Besuch unserer Website werden automatisch Informationen durch den Browser uebermittelt und in Server-Log-Dateien gespeichert: Browsertyp/-version, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage, IP-Adresse.\n\nDiese Daten sind nicht bestimmten Personen zuordenbar und werden nach 30 Tagen automatisch geloescht.',
      },
      {
        title: '3. Bestelldaten',
        body: 'Im Rahmen des Bestellvorgangs erheben wir folgende Daten:\n- Name, Vorname\n- Lieferanschrift (Strasse, PLZ, Ort, Land)\n- E-Mail-Adresse\n- Telefonnummer (freiwillig)\n- Zahlungsinformationen (ueber Stripe abgewickelt, wir speichern keine Kreditkartendaten)\n- Bestellte Produkte und Mengen\n\nDie Datenverarbeitung erfolgt zur Vertragserfuellung (Art. 6 Abs. 1 lit. b DSGVO). Die Daten werden nach Ablauf gesetzlicher Aufbewahrungsfristen (6 Jahre handelsrechtlich, 10 Jahre steuerrechtlich) geloescht.',
      },
      {
        title: '4. Zahlungsabwicklung (Stripe)',
        body: 'Die Zahlungsabwicklung erfolgt ueber Stripe, Inc., 354 Oyster Point Blvd, South San Francisco, CA 94080, USA. Stripe verarbeitet Zahlungsdaten (Kreditkartennummer, Bankdaten etc.) auf eigenen Servern. Wir erhalten von Stripe lediglich eine Bestaetigung der Zahlung, keine vollstaendigen Kartendaten.\n\nWeitere Informationen: https://stripe.com/de/privacy',
      },
      {
        title: '5. Versand und Fulfillment (CJ Dropshipping)',
        body: 'Die Bestellung wird im Dropshipping-Verfahren durch unseren Logistikpartner CJ Dropshipping (CJ Affiliate Network, LLC, 2450 Paces Ferry Road, Suite 400, Atlanta, GA 30339, USA) direkt an dich versendet.\n\nDabei werden Name, Lieferanschrift und Bestellinhalte an CJ Dropshipping uebermittelt, um den Versand durchzufuehren (Art. 6 Abs. 1 lit. b DSGVO). CJ Dropshipping verarbeitet diese Daten ausschliesslich zur Vertragserfuellung.\n\nWeitere Informationen: https://www.cjdropshipping.com/privacy-policy',
      },
      {
        title: '6. Cookies',
        body: 'Unsere Website verwendet Cookies. Dabei handelt es sich um kleine Textdateien, die dein Browser automatisch erstellt und auf deinem Geraet speichert, wenn du unsere Seite besuchst.\n\nTechnisch notwendige Cookies: Sitzungscookie (Session), Warenkorb-Cookie. Diese Cookies sind fuer den Betrieb der Website zwingend erforderlich.\n\nDu kannst die Speicherung von Cookies deaktivieren oder die Loeschung bereits gespeicherter Cookies vornehmen. Dies kann jedoch zu Einschraenkungen bei der Nutzbarkeit der Website fuehren.',
      },
      {
        title: '7. Deine Rechte',
        body: `Du hast jederzeit das Recht auf:\n- Auskunft ueber deine bei uns gespeicherten Daten (Art. 15 DSGVO)\n- Berichtigung unrichtiger Daten (Art. 16 DSGVO)\n- Loeschung deiner Daten (Art. 17 DSGVO)\n- Einschraenkung der Verarbeitung (Art. 18 DSGVO)\n- Datenuebertragbarkeit (Art. 20 DSGVO)\n- Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)\n\nAnfragen richte bitte an: ${STOREFRONT_LEGAL_CONTACT.legalEmail}`,
      },
      {
        title: '8. Beschwerderecht',
        body: 'Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehoerde zu beschweren. Zustaendig ist die Landesbeauftragte fuer den Datenschutz und fuer das Recht auf informationelle Selbstbestimmung in dem Bundesland, in dem du deinen Wohnsitz hast.',
      },
    ],
  },
  agb: {
    path: '/agb',
    title: 'Allgemeine Geschaeftsbedingungen (AGB)',
    description: 'AGB fuer Bestellungen bei ShopSIN, inklusive Dropshipping-Hinweis.',
    intro: 'Die nachfolgenden AGB gelten fuer alle Bestellungen ueber unseren Online-Shop delqhi.com. Mit der Bestellung erklaerst du dich mit diesen Bedingungen einverstanden.',
    sections: [
      {
        title: '1. Geltungsbereich',
        body: `Diese Allgemeinen Geschaeftsbedingungen gelten fuer alle Verkaeufe von Waren durch ${STOREFRONT_LEGAL_CONTACT.companyName}, Inh. ${STOREFRONT_LEGAL_CONTACT.ownerName} (nachfolgend "Anbieter") an Verbraucher ueber den Online-Shop delqhi.com. Abweichende Bedingungen des Kunden werden nicht anerkannt.`,
      },
      {
        title: '2. Vertragsschluss',
        body: 'Die Produktdarstellungen im Online-Shop stellen kein verbindliches Angebot dar, sondern dienen der Abgabe eines Kaufangebots durch den Kunden.\n\nDer Kunde gibt ein verbindliches Kaufangebot ab, indem er den Bestellvorgang abschliesst. Die Annahme des Angebots erfolgt durch die Anbieterin durch den Versand einer Bestellbestaetigung per E-Mail oder durch die Auslieferung der Ware.\n\nDie Anbieterin behaelt sich vor, ein Kaufangebot ohne Begrundung abzulehnen, insbesondere bei Verdacht auf Betrug oder Missbrauch.',
      },
      {
        title: '3. Dropshipping-Hinweis',
        body: 'Die Anbieterin betreibt einen Dropshipping-Onlineshop. Die bestellten Waren werden nicht von der Anbieterin selbst versendet, sondern direkt vom Logistikpartner CJ Dropshipping an die vom Kunden angegebene Lieferadresse versendet.\n\nDie Anbieterin ist Vertragspartnerin und bleibt alleinige Ansprechpartnerin fuer den Kunden. Fuer Maengel der Ware haftet die Anbieterin gegenueber dem Kunden nach den gesetzlichen Bestimmungen.\n\nDie Weitergabe der Lieferanschrift an CJ Dropshipping erfolgt ausschliesslich zur Vertragserfuellung (Versand der Ware).',
      },
      {
        title: '4. Preise und Zahlung',
        body: 'Alle angegebenen Preise sind Endpreise in Euro (EUR) und enthalten die gesetzliche Mehrwertsteuer.\n\nVersandkosten werden im Checkout vor Abgabe der Bestellung deutlich ausgewiesen.\n\nZahlung erfolgt ueber Stripe. Verfuegbare Zahlungsmethoden: Kreditkarte, SEPA-Lastschrift (sofern angeboten). Die Zahlungsabwicklung erfolgt durch Stripe Inc.; die Anbieterin speichert keine vollstaendigen Kartendaten.',
      },
      {
        title: '5. Lieferung',
        body: 'Die Lieferung erfolgt weltweit, vorzugsweise im DACH-Raum (Deutschland, Oesterreich, Schweiz). Die voraussichtliche Lieferzeit wird im Checkout angezeigt.\n\nDa die Waren direkt vom Logistikpartner versendet werden, koennen Lieferzeiten je nach Herkunftsland (ueberwiegend China) und Zollabfertigung variieren. Die angegebene Lieferzeit ist ein Richtwert und stellt keine garantierte Frist dar.\n\nTeillieferungen sind zulässig, soweit sie fuer den Kunden zumutbar sind.',
      },
      {
        title: '6. Eigentumsvorbehalt',
        body: 'Die gelieferte Ware bleibt bis zur vollstaendigen Bezahlung im Eigentum der Anbieterin.',
      },
      {
        title: '7. Gewaehrleistung',
        body: 'Es gelten die gesetzlichen Gewaehrleistungsbestimmungen.\n\nBei Maengeln der gelieferten Ware hat der Kunde nach seiner Wahl das Recht auf Nacherfuellung durch Nachbesserung oder Ersatzlieferung. Schlägt die Nacherfuellung fehl, kann der Kunde den Kaufpreis herabsetzen (Minderung) oder den Vertrag rueckgaengig machen (Ruecktritt).\n\nDie Verjaehrungsfrist fuer Mangelansprueche betraegt bei gebrauchten Waren ein Jahr, bei neuen Waren zwei Jahre ab Ablieferung der Ware.',
      },
      {
        title: '8. Haftungsbeschraenkung',
        body: 'Die Haftung der Anbieterin fuer Schadensersatz, gleich aus welchem Rechtsgrund, ist auf Vorsatz und grobe Fahrlaessigkeit beschraenkt. Bei leichter Fahrlaessigkeit haftet die Anbieterin nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und nur in Hoehe des vorhersehbaren, vertragstypischen Schadens.\n\nDie vorstehende Beschraenkung gilt nicht fuer die Haftung bei Verletzung von Leben, Koerper oder Gesundheit und nicht im Falle zwingender gesetzlicher Regelungen (z.B. Produkthaftungsgesetz).',
      },
      {
        title: '9. Streitschlichtung',
        body: 'Die Europaeische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr\n\nDie Anbieterin ist nicht bereit oder verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
      },
      {
        title: '10. Salvatorische Klausel',
        body: 'Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der uebrigen Bestimmungen davon unberuehrt. Anstelle der unwirksamen Bestimmung tritt eine Regelung, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am naechsten kommt.',
      },
    ],
  },
  widerrufsrecht: {
    path: '/widerrufsrecht',
    title: 'Widerrufsrecht',
    description: 'Gesetzliches Widerrufsrecht fuer Verbraucher bei ShopSIN.',
    intro: 'Verbraucher haben bei Fernabsatzvertraegen ein gesetzliches Widerrufsrecht. Nachfolgend erhaeltst du die Widerrufsbelehrung.',
    sections: [
      {
        title: 'Widerrufsbelehrung',
        body: `Widerrufsrecht\n\nDu hast das Recht, diesen Vertrag innerhalb von vierzehn Tagen ohne Angabe von Gruenden zu widerrufen.\n\nDie Widerrufsfrist betraegt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Befoerderer ist, die letzte Ware in Besitz genommen hat.\n\nUm dein Widerrufsrecht auszueben, musst du uns (${STOREFRONT_LEGAL_CONTACT.companyName}, ${STOREFRONT_LEGAL_CONTACT.ownerName}, ${STOREFRONT_LEGAL_CONTACT.address}, E-Mail: ${STOREFRONT_LEGAL_CONTACT.legalEmail}, Telefon: ${STOREFRONT_LEGAL_CONTACT.legalPhone || 'wird derzeit eingerichtet (KI-Telefonassistent in Vorbereitung)'}) mittels einer eindeutigen Erklaerung (z.B. ein mit der Post versandter Brief oder eine E-Mail) ueber deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafuer das beigefuegte Muster-Widerrufsformular verwenden, das jedoch nicht zwingend ist.\n\nZur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung ueber die Ausuebung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.`,
      },
      {
        title: 'Folgen des Widerrufs',
        body: 'Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschliesslich der Lieferkosten (mit Ausnahme der zusaetzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, guenstigste Standardlieferung gewaehlt hast), unverzueglich und spaetestens binnen vierzehn Tagen ab dem Tag zurueckzuzahlen, an dem die Mitteilung ueber deinen Widerruf dieses Vertrags bei uns eingegangen ist. Fuer diese Rueckzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der urspruenglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdruecklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rueckzahlung Entgelte berechnet.\n\nWir koennen die Rueckzahlung verweigern, bis wir die Waren wieder zurueckerhalten haben oder bis du den Nachweis erbracht hast, dass du die Waren zurueckgesandt hast, je nachdem, welches der fruehere Zeitpunkt ist.\n\nDu hast die Waren unverzueglich und in jedem Fall spaetestens binnen vierzehn Tagen ab dem Tag, an dem du uns ueber den Widerruf dieses Vertrags unterrichtest, an uns zurueckzusenden oder zu uebergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest.\n\nDu traegst die unmittelbaren Kosten der Ruecksendung der Waren.\n\nDu musst fuer einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Pruefung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurueckzufuehren ist.',
      },
      {
        title: 'Ausschluss des Widerrufsrechts',
        body: 'Das Widerrufsrecht besteht nicht bei Vertraegen zur Lieferung von Waren, die nicht vorgefertigt sind und fuer deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher massgeblich ist oder die eindeutig auf die persoenlichen Beduerfnisse des Verbrauchers zugeschnitten sind.\n\nDas Widerrufsrecht erlischt vorzeitig bei Vertraegen zur Lieferung versiegelter Waren, die aus Gruenden des Gesundheitsschutzes oder der Hygiene nicht zur Rueckgabe geeignet sind, wenn ihre Versiegelung nach der Lieferung entfernt wurde.',
      },
      {
        title: 'Muster-Widerrufsformular',
        body: `(Wenn du den Vertrag widerrufen willst, fuelle dieses Formular aus und sende es zurueck.)\n\nAn:\n${STOREFRONT_LEGAL_CONTACT.companyName}\n${STOREFRONT_LEGAL_CONTACT.ownerName}\n${STOREFRONT_LEGAL_CONTACT.address}\nE-Mail: ${STOREFRONT_LEGAL_CONTACT.legalEmail}\n\nHiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag ueber den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)\n\nBestellt am (*) / erhalten am (*)\n\nName des/der Verbraucher(s)\n\nAnschrift des/der Verbraucher(s)\n\nUnterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)\n\nDatum\n\n(*) Unzutreffendes streichen.`,
      },
    ],
  },
}
