import React from 'react';

export function PriceHistoryWidget({ currentPrice, thirtyDayBestPrice }: { currentPrice: number, thirtyDayBestPrice: number }) {
  if (!thirtyDayBestPrice || thirtyDayBestPrice >= currentPrice) return null;

  return (
    <div className="text-xs text-gray-500 mt-1">
      Günstigster Preis der letzten 30 Tage: €{thirtyDayBestPrice.toFixed(2)}
    </div>
  );
}
