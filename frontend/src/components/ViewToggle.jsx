import React from 'react';
import { FiList, FiGrid } from 'react-icons/fi';

export default function ViewToggle({ view, onChange }) {
  const btn =
    'p-2 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors';
  const active = 'bg-blue-600 text-white shadow';
  const inactive = 'text-gray-500 hover:bg-gray-200';

  return (
    <div
      className="md:hidden flex items-center gap-1 bg-gray-100 rounded-lg p-1"
      role="group"
      aria-label="Switch between list and card view"
    >
      <button
        type="button"
        title="List view"
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
        className={`${btn} ${view === 'list' ? active : inactive}`}
      >
        <FiList size={20} />
      </button>
      <button
        type="button"
        title="Card view"
        aria-pressed={view === 'card'}
        onClick={() => onChange('card')}
        className={`${btn} ${view === 'card' ? active : inactive}`}
      >
        <FiGrid size={20} />
      </button>
    </div>
  );
}
