import React, { useState, useEffect } from 'react';
import { HiMagnifyingGlass, HiXMark } from 'react-icons/hi2';

const SearchInput = ({ value, onChange, placeholder = 'Tìm kiếm...', delay = 500 }) => {
  const [searchTerm, setSearchTerm] = useState(value || '');

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, onChange, delay]);

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
  };

  return (
    <div className="relative rounded-md shadow-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <HiMagnifyingGlass className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
      <input
        type="text"
        className="block w-full rounded-md border-0 py-2 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        >
          <HiXMark className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
