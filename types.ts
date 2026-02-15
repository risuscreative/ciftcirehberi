export enum CropType {
  WHEAT = 'Buğday',
  CORN = 'Mısır',
  COTTON = 'Pamuk',
  TOMATO = 'Domates',
  SUNFLOWER = 'Ayçiçeği',
  BARLEY = 'Arpa',
}

export interface Field {
  id: string;
  name: string;
  sizeDecares: number; // Dönüm/Dekar
  cropType: CropType;
  hasIrrigation: boolean;
  location: string;
  createdAt: number;
  seasonalWarning?: string; // New field for climate suitability warnings
}

export interface Task {
  id: string;
  fieldId: string;
  analysisId?: string; // Link to specific analysis record
  title: string;
  date: string; // ISO Date (Start Date)
  endDate?: string; // ISO Date (End Date for ranges like Planting/Harvest)
  type: 'FERTILIZER' | 'IRRIGATION' | 'PESTICIDE' | 'PLANTING' | 'HARVEST';
  completed: boolean;
  description?: string;
}

export interface SoilAnalysisResult {
  ph: number;
  nitrogen: 'Low' | 'Optimal' | 'High';
  phosphorus: 'Low' | 'Optimal' | 'High';
  potassium: 'Low' | 'Optimal' | 'High';
  organicMatter: number;
  recommendations: string[];
  calculatedFertilizerAmount: string; // e.g., "15 kg/dekar"
  idealPlantingTime?: string; // e.g. "Kasım Başı"
}

export interface AnalysisRecord {
  id: string;
  date: number;
  fieldId: string;
  fieldName: string;
  cropType: string;
  result: SoilAnalysisResult;
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rainChance: number;
  radarImageUrl?: string | null;
}