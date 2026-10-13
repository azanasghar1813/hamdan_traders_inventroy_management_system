import React from 'react';

export default function MobileListView({ items, renderRow, onSelect, emptyText }) {
  if (!items?.length) {
    return (
      <div className="md:hidden bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
        {emptyText || 'No items found.'}
      </div>
    );
  }
  return (
    <ul className="md:hidden divide-y divide-gray-200 bg-white rounded-lg shadow overflow-hidden">
      {items.map((item) => (
        <li key={item._id}>
          <button
            type="button"
            onClick={() => onSelect?.(item)}
            className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50 min-h-[44px]"
          >
            {renderRow(item)}
          </button>
        </li>
      ))}
    </ul>
  );
}
