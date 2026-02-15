import { GoogleGenAI, Type } from "@google/genai";
import { CropType, SoilAnalysisResult, WeatherData, Field, Task } from "../types";

const apiKey = process.env.API_KEY || '';

// Mock result for fallback
const MOCK_SOIL_RESULT: SoilAnalysisResult = {
  ph: 6.8,
  nitrogen: 'Low',
  phosphorus: 'Optimal',
  potassium: 'High',
  organicMatter: 2.5,
  recommendations: [
    "Toprak pH seviyesi ideal aralıkta.",
    "Azot seviyesi düşük, ekim öncesi Üre gübresi tavsiye edilir.",
    "Potasyum seviyesi yüksek, ek potasyum takviyesine gerek yok."
  ],
  calculatedFertilizerAmount: "20 kg/dekar Üre",
  idealPlantingTime: "Ekim sonu"
};

// Helper for Mock Weather
const getMockWeather = (location: string): WeatherData => {
  let hash = 0;
  for (let i = 0; i < location.length; i++) {
    hash = location.charCodeAt(i) + ((hash << 5) - hash);
  }

  const isWarmRegion = ['antalya', 'adana', 'mersin', 'izmir', 'aydın'].some(c => location.toLowerCase().includes(c));
  const baseTemp = isWarmRegion ? 22 : 15;
  
  const temp = baseTemp + (Math.abs(hash) % 10);
  const humidity = 30 + (Math.abs(hash) % 50);
  const windSpeed = 5 + (Math.abs(hash) % 25);
  
  const conditions = ['Güneşli', 'Parçalı Bulutlu', 'Bulutlu', 'Hafif Yağmurlu'];
  const condition = conditions[Math.abs(hash) % conditions.length];

  return {
    temp,
    condition,
    humidity,
    windSpeed,
    rainChance: condition.includes('Yağmur') ? 80 : (Math.abs(hash) % 20),
    radarImageUrl: null
  };
};

// Helper to check for Quota Exceeded error
const isQuotaError = (error: any): boolean => {
  return error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
};

export const analyzeSoilImage = async (
  imageBase64: string, 
  cropType: CropType, 
  fieldSize: number
): Promise<SoilAnalysisResult> => {
  if (!apiKey) {
    console.warn("API Key not found, returning mock data.");
    return new Promise(resolve => setTimeout(() => resolve(MOCK_SOIL_RESULT), 2000));
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Sen uzman bir ziraat mühendisisin. Bu bir toprak analizi raporunun veya toprak fotoğrafının görüntüsüdür.
      
      Ekim yapılacak ürün: ${cropType}
      Tarla Büyüklüğü: ${fieldSize} dekar.

      Görevin:
      1. Görüntüyü analiz et ve temel toprak değerlerini (pH, Azot, Fosfor, Potasyum, Organik Madde) tahmin et veya rapordan oku.
      2. Bu ürün (${cropType}) için Türkiye iklim şartlarına uygun gübreleme tavsiyesi ver.
      3. Dekar başına atılması gereken gübre miktarını belirle.
      4. Bu bölge ve ürün için ideal ekim zamanını belirt (örn: 'Kasım başı').

      Yanıtı sadece aşağıdaki JSON formatında ver:
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ph: { type: Type.NUMBER, description: "Toprak pH değeri (0-14 arası)" },
            nitrogen: { type: Type.STRING, enum: ["Low", "Optimal", "High"], description: "Azot seviyesi" },
            phosphorus: { type: Type.STRING, enum: ["Low", "Optimal", "High"], description: "Fosfor seviyesi" },
            potassium: { type: Type.STRING, enum: ["Low", "Optimal", "High"], description: "Potasyum seviyesi" },
            organicMatter: { type: Type.NUMBER, description: "Organik madde yüzdesi" },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Çiftçi için maddeler halinde tavsiyeler" 
            },
            calculatedFertilizerAmount: { type: Type.STRING, description: "Önerilen gübre tipi ve miktarı (ör: 15 kg/dekar DAP)" },
            idealPlantingTime: { type: Type.STRING, description: "İdeal ekim zamanı" }
          },
          required: ["ph", "nitrogen", "phosphorus", "potassium", "organicMatter", "recommendations", "calculatedFertilizerAmount", "idealPlantingTime"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as SoilAnalysisResult;
    }
    
    throw new Error("Boş yanıt alındı.");

  } catch (error) {
    if (isQuotaError(error)) {
        console.warn("Gemini Analysis: Quota Exceeded. Returning mock data.");
        alert("Üzgünüz, sistem şu anda yoğun (Kota Aşımı). Lütfen biraz bekleyip tekrar deneyin.");
        return MOCK_SOIL_RESULT;
    }
    console.error("Gemini Analysis Error:", error);
    return MOCK_SOIL_RESULT;
  }
};

export const generateSchedule = async (
  fieldId: string,
  cropType: CropType,
  hasIrrigation: boolean,
  plantDate: Date,
  location: string
): Promise<{ tasks: any[], warning: string | null }> => {
  if (!apiKey) return { tasks: [], warning: null };

  const ai = new GoogleGenAI({ apiKey });
  const todayISO = new Date().toISOString().split('T')[0];
  
  const prompt = `
    Aşağıdaki bilgilere göre bir zirai takvim ve uygunluk analizi oluştur:
    - Bugünün Tarihi: ${todayISO}
    - Ürün: ${cropType}
    - Konum: ${location}
    - Sulama Sistemi: ${hasIrrigation ? "Var" : "Yok"}
    - Planlanan/Varsayılan İşlem Tarihi: ${plantDate.toISOString().split('T')[0]}
    
    Görevin:
    1. Konumun (${location}) iklim verilerini analiz et.
    2. Eğer bölge ve tarih tarımsal faaliyet için uygun değilse (örn: Kars'ta Kışın ekim yapılmaz), "warning" alanına açıklama yaz ve tasks boş döndür.
    3. Uygunsa, önümüzdeki sezon için tarihleri belirle.
    4. EKİM (PLANTING) ve HASAT (HARVEST) gibi süreçler tek bir gün değil, bir tarih aralığıdır. Bunlar için mutlaka 'endDate' belirle.
    
    Yanıtı SADECE şu JSON formatında ver:
    {
      "tasks": [ { "title": "...", "type": "FERTILIZER" | "IRRIGATION" | "PESTICIDE" | "PLANTING" | "HARVEST", "date": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" (Opsiyonel), "description": "..." } ],
      "warning": string | null
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{"tasks": [], "warning": null}');
    
    const tasks = result.tasks.map((t: any) => ({
      ...t,
      fieldId,
      completed: false,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date(t.date).toISOString(),
      endDate: t.endDate ? new Date(t.endDate).toISOString() : undefined
    }));

    return { tasks, warning: result.warning };
  } catch (e) {
    if (isQuotaError(e)) {
        console.warn("Schedule Gen: Quota Exceeded.");
        return { tasks: [], warning: "Sistem yoğunluğu nedeniyle takvim şu an oluşturulamadı. Lütfen daha sonra tekrar deneyin." };
    }
    console.error("Schedule Gen Error", e);
    return { tasks: [], warning: null };
  }
}

export const generateTasksFromAnalysis = async (
  field: Field,
  analysis: SoilAnalysisResult
): Promise<Task[]> => {
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date();
  const todayStr = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const todayISO = today.toISOString().split('T')[0];
  
  const prompt = `
    Sen uzman bir ziraat mühendisisin.
    
    BAĞLAM VE GİRDİLER:
    - Bugünün Tarihi: ${todayStr} (${todayISO})
    - Konum: ${field.location} (Bölge iklimini kesinlikle dikkate al)
    - Ürün: ${field.cropType}
    - Sulama: ${field.hasIrrigation ? "Var" : "Yok"}
    - Analiz Tavsiyesi: ${analysis.recommendations.join(", ")}
    - Analiz Gübre Miktarı: ${analysis.calculatedFertilizerAmount}
    - Analizde Belirtilen İdeal Ekim Zamanı: ${analysis.idealPlantingTime || "Belirtilmemiş"}

    HEDEF:
    Bu tarla için gerçekçi, takvim bazlı bir tarım planı oluştur.
    
    KRİTİK TARİH HESAPLAMA KURALLARI:
    1. Göreli gün sayısı (daysFromNow) KULLANMA. Doğrudan "YYYY-MM-DD" formatında kesin tarih ver.
    2. Bugünün tarihini (${todayISO}) referans al. Geçmişe dönük görev oluşturma.
    3. Yıl Geçişleri: Eğer uygun ekim/işlem zamanı önümüzdeki takvim yılına sarkıyorsa yıl bilgisini artır.
    4. Bölgesel Doğrulama: ${field.location} iklimine uygun tarihler ver.
    5. TARİH ARALIKLARI: Ekim (PLANTING) ve Hasat (HARVEST) işlemleri için mutlaka bir "endDate" belirleyerek uygun zaman aralığını (penceresini) göster. Gübreleme ve sulama genelde tek gündür ancak gerekirse aralık verebilirsin.

    ÇIKTI FORMATI (JSON):
    [
      {
        "title": "Görev Başlığı (Türkçe)",
        "type": "FERTILIZER" | "IRRIGATION" | "PESTICIDE" | "PLANTING" | "HARVEST",
        "date": "YYYY-MM-DD", // Başlangıç
        "endDate": "YYYY-MM-DD", // Bitiş (Opsiyonel, Ekim/Hasat için zorunlu)
        "description": "Detaylı açıklama ve miktar."
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const tasksRaw = JSON.parse(response.text || '[]');
    
    return tasksRaw.map((t: any) => {
        // Validate date string
        let dateStr = t.date;
        if (!dateStr || isNaN(Date.parse(dateStr))) {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            dateStr = d.toISOString().split('T')[0];
        }

        let endDateStr = t.endDate;
        if (endDateStr && isNaN(Date.parse(endDateStr))) {
            endDateStr = undefined;
        }

        return {
            id: Math.random().toString(36).substr(2, 9),
            fieldId: field.id,
            title: t.title,
            type: t.type,
            date: new Date(dateStr).toISOString(),
            endDate: endDateStr ? new Date(endDateStr).toISOString() : undefined,
            completed: false,
            description: t.description
        };
    });

  } catch (error) {
    if (isQuotaError(error)) {
        console.warn("Generate Tasks: Quota Exceeded.");
        throw new Error("Sistem yoğunluğu (Kota Aşımı). Lütfen daha sonra tekrar deneyiniz.");
    }
    console.error("Generate Tasks from Analysis Error:", error);
    return [];
  }
};

// Fetch real weather using Gemini Search Grounding targeting MGM
export const getWeatherForLocation = async (location: string): Promise<WeatherData> => {
  if (!apiKey) return getMockWeather(location);

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    "${location}" için Meteoroloji Genel Müdürlüğü (mgm.gov.tr) kaynaklı güncel hava durumunu bul.
    Sıcaklık, durum, nem, rüzgar hızı ve yağış ihtimali verilerini getir.
    Ayrıca bu konuma veya Türkiye geneline ait güncel bir meteorolojik harita, radar veya uydu görüntüsü URL'si bul.
    
    Yanıtı SADECE şu JSON formatında ver:
    {
      "temp": number (derece),
      "condition": string (Türkçe, kısa),
      "humidity": number (yüzde),
      "windSpeed": number (km/s),
      "rainChance": number (yüzde),
      "radarImageUrl": string | null
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
       const data = JSON.parse(response.text);
       return data;
    }
  } catch (e) {
    if (isQuotaError(e)) {
      console.warn("Weather fetch quota exceeded, falling back to mock data.");
    } else {
      console.error("MGM Weather Fetch Failed", e);
    }
  }
  
  // Fallback to mock if API fails
  return getMockWeather(location);
};