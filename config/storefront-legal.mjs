export const STOREFRONT_LEGAL_CONTACT = {
  ownerName: 'Simone Schulze',
  address: 'Hochwaldpromenade 38, 15834 Rangsdorf, Deutschland',
  legalEmail: 'schulze8234@gmail.com',
  legalPhone: '+49 152 13525956',
}

export const STOREFRONT_LEGAL_LINKS = [
  { label: 'Impressum', href: '/impressum' },
  { label: 'Datenschutz', href: '/datenschutz' },
  { label: 'AGB', href: '/agb' },
  { label: 'Widerruf', href: '/widerrufsrecht' },
]

export const STOREFRONT_FOOTER_LEGAL_NOTE =
  'Preise in EUR. Versand im DACH-Raum. Lieferung, Rueckgabe und Kontakt klar dokumentiert.'

export const STOREFRONT_LEGAL_PAGES = {
  impressum: {
    path: '/impressum',
    title: 'Impressum',
    description: 'Anbieterkennzeichnung, Kontakt und steuerliche Pflichtangaben fuer Simone Shop.',
    intro: 'Pflichtangaben fuer Simone Shop mit Anbieterangaben und direktem Kontakt fuer rechtliche Anfragen.',
  },
  datenschutz: {
    path: '/datenschutz',
    title: 'Datenschutz',
    description: 'Informationen zur Verarbeitung personenbezogener Daten gemaess DSGVO bei Simone Shop.',
    intro: 'Informationen zur Verarbeitung personenbezogener Daten gemaess DSGVO.',
    sections: [
      {
        title: 'Verarbeitungszwecke',
        body: 'Wir verarbeiten Daten zur Bestellabwicklung, Kundenkommunikation und Serviceverbesserung.',
      },
      {
        title: 'Rechtsgrundlagen',
        body: 'Die Verarbeitung erfolgt auf Basis von Vertragserfuellung, rechtlicher Verpflichtung oder Einwilligung.',
      },
      {
        title: 'Betroffenenrechte',
        body: 'Du kannst Auskunft, Berichtigung, Loeschung und Einschraenkung der Verarbeitung verlangen.',
      },
    ],
  },
  agb: {
    path: '/agb',
    title: 'AGB',
    description: 'Allgemeine Geschaeftsbedingungen fuer Bestellungen bei Simone Shop.',
    intro: 'Allgemeine Geschaeftsbedingungen fuer Bestellungen bei Simone Shop.',
    sections: [
      {
        title: 'Geltungsbereich',
        body: 'Diese Bedingungen gelten fuer alle Bestellungen ueber unseren Online-Shop.',
      },
      {
        title: 'Vertragsschluss',
        body: 'Der Vertrag kommt durch Annahme deiner Bestellung durch uns zustande.',
      },
      {
        title: 'Preise und Zahlung',
        body: 'Alle Preise werden transparent im Checkout dargestellt. Versteckte Gebuehren gibt es nicht.',
      },
    ],
  },
  widerrufsrecht: {
    path: '/widerrufsrecht',
    title: 'Widerrufsrecht',
    description: 'Hinweise zum gesetzlichen Widerrufsrecht fuer Verbraucher bei Simone Shop.',
    intro: 'Hinweise zum gesetzlichen Widerrufsrecht fuer Verbraucher.',
    sections: [
      {
        title: 'Widerrufsfrist',
        body: 'Die Frist betraegt 14 Tage ab Erhalt der Ware, sofern keine gesetzlichen Ausnahmen greifen.',
      },
      {
        title: 'Ausuebung',
        body: 'Der Widerruf kann per E-Mail erklaert werden. Anschliessend erhaeltst du die Ruecksendeanweisungen.',
      },
      {
        title: 'Folgen',
        body: 'Nach Eingang und Pruefung der Ware erfolgt die Rueckerstattung ueber die urspruengliche Zahlungsart.',
      },
    ],
  },
}
