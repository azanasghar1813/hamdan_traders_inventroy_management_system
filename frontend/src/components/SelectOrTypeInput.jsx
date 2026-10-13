import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiPlus, FiX, FiCheck, FiEdit3 } from 'react-icons/fi';

/**
 * Reusable dropdown component that displays existing items
 * and provides a manual writing option at the top of the list (or direct text input).
 */
const SelectOrTypeInput = ({
  label,
  entityName = 'Customer', // 'Customer' or 'Supplier'
  items = [],
  value = { id: '', name: '', isManual: false },
  onChange,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isDirectInputMode, setIsDirectInputMode] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const directInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opening dropdown
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Auto-focus direct input mode
  useEffect(() => {
    if (isDirectInputMode && directInputRef.current) {
      directInputRef.current.focus();
    }
  }, [isDirectInputMode]);

  const handleSelectExisting = (item) => {
    onChange({
      id: item._id,
      name: item.name,
      isManual: false
    });
    setIsOpen(false);
    setSearchText('');
  };

  const handleApplyManual = (nameToUse) => {
    const trimmed = (nameToUse || searchText).trim();
    if (!trimmed) return;

    // Check if it already exists exactly
    const existing = items.find(i => i.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      onChange({
        id: existing._id,
        name: existing.name,
        isManual: false
      });
    } else {
      onChange({
        id: '',
        name: trimmed,
        isManual: true
      });
    }
    setIsOpen(false);
    setSearchText('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ id: '', name: '', isManual: false });
    setSearchText('');
  };

  // Filter existing items
  const filteredItems = items.filter(item => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(query);
    const phoneMatch = item.phone?.toLowerCase().includes(query);
    return nameMatch || phoneMatch;
  });

  return (
    <div className="w-full md:w-1/2" ref={containerRef}>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => {
            setIsDirectInputMode(!isDirectInputMode);
            setIsOpen(false);
          }}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium hover:underline"
        >
          <FiEdit3 className="w-3 h-3" />
          {isDirectInputMode ? `Pick from list` : `Type manually`}
        </button>
      </div>

      {isDirectInputMode ? (
        // Direct manual text input
        <div className="relative">
          <input
            ref={directInputRef}
            type="text"
            value={value.name}
            onChange={(e) => {
              const val = e.target.value;
              const match = items.find(i => i.name.toLowerCase() === val.trim().toLowerCase());
              onChange({
                id: match ? match._id : '',
                name: val,
                isManual: !match
              });
            }}
            placeholder={`Enter ${entityName.toLowerCase()} name manually...`}
            className="w-full px-3 py-2 border border-indigo-400 ring-1 ring-indigo-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {value.name && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              title="Clear"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        // Dropdown with manual option at top
        <div className="relative">
          {/* Main Select Button */}
          <div
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full px-3 py-2 border rounded-md cursor-pointer flex items-center justify-between bg-white transition-colors ${
              isOpen ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {value.name ? (
                <>
                  <span className="font-medium text-gray-800 truncate">{value.name}</span>
                  {value.isManual && (
                    <span className="text-[10px] uppercase font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                      Manual
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-400">-- Select {entityName} --</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              {value.name && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  title="Clear"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
              <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
              {/* TOP OF LIST: Manual Writing / Search Input */}
              <div className="p-2 border-b border-gray-100 bg-gray-50">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (searchText.trim()) {
                          handleApplyManual();
                        }
                      }
                    }}
                    placeholder={`Write ${entityName.toLowerCase()} name or search...`}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                {/* Always visible quick action if user typed custom text */}
                {searchText.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleApplyManual()}
                    className="mt-2 w-full text-left px-3 py-2 text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md flex items-center justify-between font-medium transition-colors"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FiPlus className="w-4 h-4 shrink-0 text-indigo-600" />
                      <span>Use "<strong>{searchText.trim()}</strong>" (Manual)</span>
                    </span>
                    <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">Enter ↵</span>
                  </button>
                )}
              </div>

              {/* Existing List */}
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  Existing {entityName}s ({filteredItems.length})
                </div>

                {filteredItems.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No {entityName.toLowerCase()}s found matching "{searchText}".
                    {searchText.trim() && (
                      <p className="text-xs text-indigo-600 mt-1">
                        Click "Use '{searchText.trim()}'" above to use as manual {entityName.toLowerCase()}.
                      </p>
                    )}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = value.id === item._id;
                    return (
                      <button
                        type="button"
                        key={item._id}
                        onClick={() => handleSelectExisting(item)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-indigo-50 transition-colors ${
                          isSelected ? 'bg-indigo-50/70 font-semibold text-indigo-900' : 'text-gray-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-gray-800">{item.name}</div>
                          {item.phone && (
                            <div className="text-xs text-gray-500">{item.phone}</div>
                          )}
                        </div>
                        {isSelected && <FiCheck className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectOrTypeInput;
