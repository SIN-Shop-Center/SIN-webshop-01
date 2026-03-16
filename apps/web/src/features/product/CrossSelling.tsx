import React from 'react';

export function CrossSelling({ productId }: { productId: string }) {
  // Simulate KI "Frequently Bought Together" logic
  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h3 className="text-xl font-bold mb-4">Wird oft zusammen gekauft</h3>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="min-w-[150px] border p-4 rounded-lg">
            <div className="bg-gray-100 h-32 w-full rounded mb-2" />
            <div className="font-semibold text-sm">Zubehör {i}</div>
            <div className="text-gray-500 text-xs">+ €19.99</div>
            <button className="w-full mt-2 bg-black text-white text-xs py-1 rounded">
              Hinzufügen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
