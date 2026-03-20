import fs from 'node:fs';
import path from 'node:path';

function replaceInFile(filePath, replacements) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  
  for (const [oldStr, newStr] of replacements) {
    if (content.includes(oldStr)) {
      content = content.split(oldStr).join(newStr);
      changed = true;
    } else {
      console.warn(`String not found in ${filePath}:\n"${oldStr}"`);
    }
  }
  
  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

// 1. CheckoutPageSections.tsx
replaceInFile('apps/web/src/app/checkout/CheckoutPageSections.tsx', [
  ['{segmentLabel} mit sichtbaren Gesamtkosten, klaren Pflichtfeldern und nur drei nächsten Schritten.', 'Sicherer Checkout. Deine Daten werden verschlüsselt übertragen und vertraulich behandelt.'],
  ['Nur Pflichtfelder', 'SSL-Verschlüsselt'],
  ['Zahlung erst nach Prüfung', 'Käuferschutz'],
  ['Gesamtkosten sichtbar', 'Schneller Versand']
]);

// 2. PaymentStep.tsx
replaceInFile('apps/web/src/features/checkout/forms/PaymentStep.tsx', [
  ['Hier wählst du nur den bevorzugten Zahlungsweg. Vor der finalen Freigabe siehst du beim Anbieter alle Zahlungsdaten noch einmal.', 'Wähle deine bevorzugte Zahlungsmethode. Alle Transaktionen sind sicher und nach modernsten Standards verschlüsselt.'],
  ['Zahlungsdaten gibst du erst beim Zahlungsanbieter ein. Vorher bleiben Gesamtbetrag und Pflichtangaben sichtbar.', 'Schnell und sicher bezahlen. Deine Daten sind bei uns in besten Händen.'],
  ['Die finale Zahlungsbestätigung erfolgt erst beim Zahlungsanbieter. Dort siehst du Karte oder Link mit allen Zahlungsdaten vor Abschluss noch einmal.', 'Deine Bestellung wird erst im nächsten Schritt nach deiner finalen Prüfung verbindlich abgeschlossen.'],
  ['Keine versteckten Kosten', 'Volle Kostentransparenz'],
  ['Gesamtbetrag und Bestellangaben bleiben vor der Weiterleitung sichtbar.', 'Du siehst alle Kosten auf einen Blick, bevor du zahlst.'],
  ['Erst prüfen, dann zahlen', 'Sicher einkaufen'],
  ['Im nächsten Schritt kontrollierst du Adresse, Artikel und Pflichtangaben gesammelt.', 'Im nächsten Schritt kannst du deine Bestellung noch einmal in Ruhe prüfen.']
]);

// 3. ReviewStep.tsx
replaceInFile('apps/web/src/features/checkout/review/ReviewStep.tsx', [
  ['Letzter Blick auf Adresse, Artikel und Pflichtbestätigungen. Danach geht es sicher zum Zahlungsanbieter.', 'Bitte prüfe deine Bestellung. Im nächsten Schritt schließt du den Kauf sicher ab.'],
  ['Vor dem Absenden noch klar', 'Deine Vorteile bei uns'],
  ['Versand, Rückgabe und Pflichtangaben bleiben auch im letzten Schritt sichtbar.', 'Kostenloser Versand ab 50€ Bestellwert. Schnelle Lieferung direkt zu dir nach Hause.'],
  ['Es kommen keine versteckten Kosten nach dem Klick auf den Zahlungsanbieter dazu.', '30 Tage Rückgaberecht. Du kannst Artikel problemlos und stressfrei zurücksenden.']
]);

// 4. ProductsPageHeader.tsx
replaceInFile('apps/web/src/app/products/ProductsPageHeader.tsx', [
  ['Für Teams mit klarem Preisbezug, nachvollziehbarer Verfügbarkeit und wenig Reibung bis zur Bestellung.', 'Professionelles Equipment für dein Team. Zuverlässige Qualität und planbare Verfügbarkeit.'],
  ['Für Privatkunden mit schneller Orientierung, sichtbaren Kosten und ruhigen nächsten Schritten.', 'Entdecke Premium-Produkte für deinen Alltag. Höchste Qualität, die überzeugt.'],
  ['Preis vorab sichtbar', 'Geprüfte Qualität'],
  ['Bestand direkt lesbar', 'Schneller Versand'],
  ['USt-IdNr. nur bei Bedarf', 'Kauf auf Rechnung'],
  ['Lieferung 24-48h', 'Kostenloser Versand ab 50€'],
  ['Rückgabe und Kontakt klar', '30 Tage Rückgaberecht'],
  ['Schneller zum richtigen Produkt.', 'Ausgewählte Produkte für deinen Alltag.'],
  ['Verfügbarkeit, Preis und Wiederbestellung bleiben klar, damit Teams ohne Beschaffungschaos einkaufen können.', 'Statte dein Team mit den besten Tools aus. Profitiere von Firmenkonditionen und schnellem Versand.'],
  ['Preis, Lieferung und Rückgabe sind früh sichtbar, damit du ohne Suchstress entscheiden kannst.', 'Entdecke unsere Kollektion aus Elektronik, Home & Living und Pflege. Höchste Qualität, die deinen Alltag besser macht.'],
  ['Bestseller und Schnellfilter direkt oben', 'Sorgfältig kuratiert'],
  ['Bewertungs- und Lieferlogik im Sortiment', 'Von Kunden exzellent bewertet'],
  ['Suche direkt im Sortiment. Preis, Verfügbarkeit und Rückgabe bleiben dabei sichtbar.', 'Finde genau das, was du suchst – in bester Qualität und sofort lieferbar.'],
  ['Kosten und Verfügbarkeit bleiben vor der Freigabe sichtbar.', 'Attraktive Konditionen für Geschäftskunden und schnelle Lieferung.'],
  ['Teams sehen direkt, was bestellbar ist und müssen nicht durch Zusatzflächen springen.', 'Greife auf Echtzeit-Bestände zu und plane deinen Einkauf zuverlässig.'],
  ['Relevante Firmenangaben erst dann, wenn sie gebraucht werden.', 'Einfacher Checkout mit Rechnungskauf und optionaler PO-Nummer.'],
  ['USt-IdNr., Referenz und Firma bleiben außerhalb des Hauptflusses, bis sie wirklich nötig sind.', 'Wir machen den Beschaffungsprozess so einfach und reibungslos wie möglich.'],
  ['Suche und Filter führen schneller zur passenden Nachbestellung.', 'Dein individuelles Sortiment für schnelle und fehlerfreie Nachbestellungen.'],
  ['Das Sortiment bleibt ruhig, damit Wiederholungskäufe nicht nach Marketplace aussehen.', 'Speichere Favoriten und bestelle Verbrauchsartikel mit wenigen Klicks neu.'],
  ['Preis und Lieferung sind im Sortiment früh lesbar.', 'Jedes Produkt in unserem Sortiment durchläuft strenge Qualitätskontrollen.'],
  ['Besucher erkennen den Aufwand sofort und müssen nicht erst in den Checkout hinein.', 'Wir bieten nur Produkte an, von denen wir selbst zu 100% überzeugt sind.'],
  ['Rückgabe und Kontakt bleiben im Kaufkontext erklärt.', 'Bestelle heute und erhalte deine Lieferung in der Regel innerhalb von 24-48 Stunden.'],
  ['Vertrauen entsteht über sichtbare Regeln, nicht über zusätzliche Werbeflächen.', 'Ab 50€ Bestellwert übernehmen wir die Versandkosten komplett für dich.'],
  ['Suche, Schnellfilter und Produktkarten führen schneller zum Treffer.', 'Kaufe ohne Risiko. Du kannst alle Artikel innerhalb von 30 Tagen entspannt zurücksenden.'],
  ['Die Katalogseite führt jetzt über Bestseller, Lieferung, Bewertung und Einsatzbereich.', 'Unser Kundenservice hilft dir bei Fragen jederzeit gerne und unkompliziert weiter.'],
  ['Kostenklarheit', 'Geprüfte Qualität'],
  ['Sichere Entscheidung', 'Schneller Versand'],
  ['Weniger Reibung', '30 Tage Rückgaberecht']
]);

// 5. ProductsResultsSummary.tsx
replaceInFile('apps/web/src/app/products/ProductsResultsSummary.tsx', [
  ['Entferne Suche oder Filter, damit du wieder das volle Sortiment mit sichtbaren Kosten siehst.', 'Passe deine Filter an, um weitere großartige Produkte zu entdecken.'],
  ['Treffer für "${trimmedSearch}" mit früh sichtbaren Preisen, Lieferung und Rückgabe.', 'Treffer für "${trimmedSearch}" in bester Qualität.'],
  ['Preis, Lieferung und Rückgabe bleiben direkt im Sortiment sichtbar.', 'Finde genau das, was du suchst – sofort lieferbar.']
]);

// 6. ProductInfoPanel.tsx
replaceInFile('apps/web/src/features/product/ProductInfoPanel.tsx', [
  ['Verfügbarkeit sofort sichtbar', 'Premium Verarbeitungsqualität'],
  ['Für Wiederbestellungen geeignet', 'Geprüfte Langlebigkeit'],
  ['Firmenkauf ohne Zusatzschritte', 'Volle Garantie'],
  ['Preis und Lieferung früh sichtbar', 'Premium Verarbeitungsqualität'],
  ['Schnell im Warenkorb und Checkout', 'Kostenloser Versand ab 50€'],
  ['Rückgabe klar erklärt', '30 Tage Geld-zurück-Garantie'],
  ['Warum dieses Produkt schnell passt', 'Highlights & Vorteile']
]);

// 7. ProductPricingBlock.tsx
replaceInFile('apps/web/src/features/product/pricing/ProductPricingBlock.tsx', [
  ['MwSt., Versand und Lieferhinweise bleiben vor dem letzten Schritt sichtbar.', 'Inkl. MwSt., versandfertig in 24h.'],
  ['USt-IdNr. und Referenz möglich', 'Kauf auf Rechnung möglich'],
  ['Rückfragen und Firmenkauf im Checkout', 'Persönlicher B2B Support'],
  ['30 Tage Rückgabe klar erklärt', '30 Tage sorgenfreie Rückgabe']
]);

// 8. ProductTrustPanel.tsx
replaceInFile('apps/web/src/features/product/trust/ProductTrustPanel.tsx', [
  ['Rückgabe und Ablauf bleiben direkt am Produkt sichtbar.', 'Entspannt ausprobieren. Du kannst alle Artikel innerhalb von 30 Tagen zurücksenden.'],
  ['MwSt., Versand und nächste Schritte vor dem Kauf sichtbar.', 'Keine versteckten Gebühren. Volle Transparenz bei Versand und Steuern.'],
  ['Fragen zum Produkt oder zur Bestellung schnell klären.', 'Unser Team ist bei Fragen jederzeit für dich da.'],
  ['Verfügbarkeit und Gesamtkosten bleiben vor dem letzten Schritt sichtbar.', 'Spezielle Firmenkonditionen und Mengenrabatte verfügbar.'],
  ['USt-IdNr. und Bestellreferenz direkt im Checkout erfassen.', 'Bequemer Kauf auf Rechnung für verifizierte Unternehmenskunden.'],
  ['Rückfragen zu Bestellung, Lieferung oder Beschaffung schnell klären.', 'Dein persönlicher Ansprechpartner kümmert sich um dein Anliegen.']
]);

// 9. [id]/page.tsx
replaceInFile('apps/web/src/app/products/[id]/page.tsx', [
  ['Sekundäre Produkte bleiben sichtbar, ohne den Hauptkauf zu überlagern.', 'Perfekte Ergänzungen, die das Beste aus deinem Produkt herausholen.'],
  ['Falls du noch zwischen mehreren Lösungen schwankst, bleiben hier Preis, Lieferung und Nutzen vergleichbar.', 'Weitere erstklassige Alternativen aus derselben Kategorie.'],
  ['Du kannst den Entscheidungsfaden wieder aufnehmen, ohne neu suchen zu müssen.', 'Diese Highlights hast du dir vor kurzem angesehen.']
]);

