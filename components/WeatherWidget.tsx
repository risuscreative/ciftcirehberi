import React, { useState } from 'react';
import { CloudRain, Sun, Wind, Droplets, Map, RefreshCw } from 'lucide-react';
import { WeatherData } from '../types';

interface WeatherWidgetProps {
  data: WeatherData;
  locationName?: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ data, locationName = "Konumunuz" }) => {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-6 relative overflow-hidden group transition-all">
      {/* Decorative background element */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
      
      {/* Header */}
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h3 className="text-blue-100 text-sm font-medium mb-1 uppercase tracking-wide flex items-center gap-1">
             {locationName}
             <span className="text-[10px] bg-blue-700/50 px-1.5 py-0.5 rounded text-blue-200">MGM</span>
          </h3>
        </div>
        {data.radarImageUrl && (
            <button 
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors"
            >
                <Map size={14} />
                {showMap ? 'Veriler' : 'Harita'}
            </button>
        )}
      </div>

      {!showMap ? (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center relative z-10 mt-2">
                <div className="flex items-end">
                    <span className="text-5xl font-bold tracking-tighter">{data.temp}°</span>
                    <div className="mb-2 ml-2">
                        <span className="block text-lg text-blue-100 font-medium leading-none">{data.condition}</span>
                    </div>
                </div>
                <Sun size={48} className="text-yellow-300 animate-pulse" />
            </div>

            <div className="mt-6 flex justify-between border-t border-white/20 pt-4 relative z-10">
                <div className="flex flex-col items-center">
                <Wind size={18} className="text-blue-200 mb-1" />
                <span className="text-xs text-blue-100">Rüzgar</span>
                <span className="font-bold">{data.windSpeed} km/s</span>
                </div>
                <div className="flex flex-col items-center">
                <Droplets size={18} className="text-blue-200 mb-1" />
                <span className="text-xs text-blue-100">Nem</span>
                <span className="font-bold">%{data.humidity}</span>
                </div>
                <div className="flex flex-col items-center">
                <CloudRain size={18} className="text-blue-200 mb-1" />
                <span className="text-xs text-blue-100">Yağış</span>
                <span className="font-bold">%{data.rainChance}</span>
                </div>
            </div>
        </div>
      ) : (
        <div className="mt-4 animate-fade-in relative z-10">
            <div className="aspect-video w-full bg-blue-800/50 rounded-xl overflow-hidden border border-white/20 relative">
                {data.radarImageUrl ? (
                    <img 
                        src={data.radarImageUrl} 
                        alt="Meteoroloji Haritası" 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-blue-200 text-sm">
                        Harita bulunamadı
                    </div>
                )}
                <div className="absolute bottom-2 right-2 text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded">
                    Kaynak: mgm.gov.tr
                </div>
            </div>
            <p className="text-center text-xs text-blue-200 mt-2">Güncel meteorolojik radar/uydu görüntüsü</p>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;