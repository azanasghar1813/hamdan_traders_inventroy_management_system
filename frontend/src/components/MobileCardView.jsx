import React from 'react';

export default function MobileCardView({ items, renderCard, onSelect, emptyText }) {
  if (!items?.length) {
    return (
      <div className="md:hidden bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
        {emptyText || 'No items found.'}
      </div>
    );
  }
  return (
    <div className="md:hidden grid gap-3">
      {items.map((item) => (
        <div key={item._id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
          {renderCard(item, onSelect)}
        </div>
      ))}
    </div>
  );
}
