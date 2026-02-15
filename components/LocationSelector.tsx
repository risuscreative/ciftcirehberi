import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import CityDistrictSelector from './CityDistrictSelector';

interface LocationSelectorProps {
  currentLocation: string | null;
  onSelect: (location: string) => void;
  onCancel?: () => void;
}

const POPULAR_LOCATIONS = [
  "Adana, Yüreğir",
  "Konya, Karatay",
  "Antalya, Serik",
  "Şanlıurfa, Harran",
  "Tekirdağ, Hayrabolu",
  "Manisa, Akhisar"
];

const LocationSelector: React.FC<LocationSelectorProps> = ({ currentLocation, onSelect, onCancel }) => {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGpsClick = () => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        // Mocking GPS to a formatted string for demo purposes
        setTimeout(() => {
            onSelect(`Antalya, Muratpaşa`); // Simulated "Nearest" city
            setLoading(false);
        }, 1000);
      }, (error) => {
        alert("Konum alınamadı. Lütfen elle seçiniz.");
        setLoading(false);
      });
    } else {
      alert("Tarayıcınız konum servisini desteklemiyor.");
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-100 p-6 relative">
        {onCancel && (
            <button 
                onClick={onCancel}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 font-bold"
            >
                ✕
            </button>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} />
          </div>
          <h2 className="text-2xl font-bold text-stone-800">Bölgenizi Seçin</h2>
          <p className="text-stone-500 mt-2 text-sm">
            Hava durumu ve zirai takvimi size özel hazırlayabilmemiz için tarım yaptığınız bölgeyi seçin.
          </p>
        </div>

        <div className="mb-4">
            <CityDistrictSelector 
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder="İl ve İlçe Ara..."
            />
        </div>

        <button 
          onClick={handleConfirm}
          disabled={!selectedLocation}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          Seçimi Onayla
        </button>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="flex-shrink-0 mx-4 text-stone-400 text-xs uppercase font-bold">Veya</span>
            <div className="flex-grow border-t border-stone-200"></div>
        </div>

        <button 
          onClick={handleGpsClick}
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 transition-colors border border-green-200"
        >
          {loading ? (
             <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
          ) : <Navigation size={18} />}
          {loading ? "Konum Bulunuyor..." : "Mevcut Konumumu Kullan"}
        </button>

        <div className="mt-6">
           <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-3">Popüler Bölgeler</h3>
           <div className="flex flex-wrap gap-2">
             {POPULAR_LOCATIONS.map(loc => (
               <button 
                 key={loc}
                 onClick={() => onSelect(loc)}
                 className="px-3 py-1.5 bg-stone-100 text-stone-600 text-sm rounded-lg hover:bg-stone-200 transition-colors"
               >
                 {loc}
               </button>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;