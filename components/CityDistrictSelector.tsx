import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapPin, Search, ChevronDown } from 'lucide-react';
import { TURKEY_LOCATIONS } from '../data/turkey_data';

interface CityDistrictSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

const CityDistrictSelector: React.FC<CityDistrictSelectorProps> = ({ 
  value, 
  onChange, 
  placeholder = "İl ve İlçe Seçiniz",
  hasError = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flatten the locations into searchable "City, District" strings
  const allLocations = useMemo(() => {
    const list: string[] = [];
    Object.entries(TURKEY_LOCATIONS).forEach(([city, districts]) => {
      districts.forEach(district => {
        list.push(`${city}, ${district}`);
      });
    });
    return list;
  }, []);

  const filteredLocations = useMemo(() => {
    if (!searchTerm) return allLocations.slice(0, 100); // Limit initial view for performance
    const lowerSearch = searchTerm.toLocaleLowerCase('tr-TR');
    return allLocations.filter(loc => 
      loc.toLocaleLowerCase('tr-TR').includes(lowerSearch)
    ).slice(0, 100);
  }, [allLocations, searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (loc: string) => {
    onChange(loc);
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl bg-stone-50 border cursor-pointer transition-all ${
          hasError ? 'border-red-500 ring-1 ring-red-200' : 'border-stone-200 hover:border-green-400 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-200'
        }`}
      >
        <div className="flex items-center gap-2 text-stone-700 w-full overflow-hidden">
           <MapPin size={20} className={value ? "text-green-600" : "text-stone-400"} />
           {value ? (
             <span className="font-medium truncate">{value}</span>
           ) : (
             <span className="text-stone-400 truncate">{placeholder}</span>
           )}
        </div>
        <ChevronDown size={16} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-100 z-50 max-h-80 overflow-hidden flex flex-col animate-fade-in">
          <div className="p-2 border-b border-stone-100 bg-stone-50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input 
                autoFocus
                type="text"
                placeholder="İl veya İlçe Ara..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-1 scrollbar-thin">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleSelect(loc)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    value === loc ? 'bg-green-50 text-green-700 font-bold' : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {loc}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-stone-400 text-sm">
                Sonuç bulunamadı.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityDistrictSelector;