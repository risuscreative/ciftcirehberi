import React, { useState, useEffect, useRef } from 'react';
import { 
  Sprout, 
  MapPin, 
  Droplets, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Camera, 
  ArrowRight,
  Leaf,
  Calendar,
  Loader2,
  Edit2,
  History,
  ChevronLeft,
  AlertTriangle,
  Trash2,
  X,
  Filter,
  CalendarPlus,
  Clock,
  ArrowRightCircle
} from 'lucide-react';
import Navigation from './components/Navigation';
import WeatherWidget from './components/WeatherWidget';
import LocationSelector from './components/LocationSelector';
import CityDistrictSelector from './components/CityDistrictSelector';
import { Field, CropType, Task, SoilAnalysisResult, WeatherData, AnalysisRecord } from './types';
import { analyzeSoilImage, generateSchedule, getWeatherForLocation, generateTasksFromAnalysis } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// --- Global State Simulation ---
const INITIAL_FIELDS: Field[] = [];
const INITIAL_TASKS: Task[] = [];
const INITIAL_HISTORY: AnalysisRecord[] = [];

// Helper to format date or date range
const formatTaskDate = (task: Task) => {
  const start = new Date(task.date);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const startStr = start.toLocaleDateString('tr-TR', options);
  
  if (task.endDate) {
    const end = new Date(task.endDate);
    // If end date is invalid or same as start, just return start
    if (isNaN(end.getTime()) || end.getTime() === start.getTime()) return startStr;

    // If same month, shorten the display: "15 - 20 Ekim"
    if (start.getMonth() === end.getMonth()) {
       return `${start.getDate()} - ${end.getDate()} ${start.toLocaleDateString('tr-TR', { month: 'long' })}`;
    }
    
    // Different months: "25 Ekim - 5 Kasım"
    const endStr = end.toLocaleDateString('tr-TR', options);
    return `${startStr} - ${endStr}`;
  }
  
  return startStr;
};

// --- Page Components ---

// 1. Home Dashboard
const HomeDashboard = ({ 
  fields, 
  tasks, 
  userLocation, 
  weather 
}: { 
  fields: Field[], 
  tasks: Task[], 
  userLocation: string,
  weather: WeatherData | null
}) => {
  
  const urgentTasks = tasks.filter(t => !t.completed).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);

  // Helper to get field name by ID
  const getFieldName = (id: string) => fields.find(f => f.id === id)?.name || 'Bilinmeyen Tarla';

  return (
    <div className="p-4 pb-24 space-y-6 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Merhaba, Çiftçi</h1>
          <div className="flex items-center gap-1 text-stone-500 text-sm">
             <MapPin size={14} />
             <span>{userLocation}</span>
          </div>
        </div>
        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold border border-green-200">
          A
        </div>
      </header>

      {weather ? (
        <WeatherWidget data={weather} locationName={userLocation} />
      ) : (
        <div className="h-40 bg-stone-200 animate-pulse rounded-2xl mb-6" />
      )}

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-stone-800">Yaklaşan Görevler</h2>
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
            {tasks.filter(t => !t.completed).length} Bekleyen
          </span>
        </div>
        
        {urgentTasks.length > 0 ? (
          <div className="space-y-3">
            {urgentTasks.map(task => (
              <div key={task.id} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex items-start gap-3">
                <div className={`mt-1 h-3 w-3 rounded-full shrink-0 ${
                  task.type === 'IRRIGATION' ? 'bg-blue-500' : 
                  task.type === 'FERTILIZER' ? 'bg-orange-500' : 'bg-green-500'
                }`} />
                <div className="flex-1">
                  <div className="flex justify-between">
                     <h4 className="font-semibold text-stone-800 text-sm">{task.title}</h4>
                     <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500 truncate max-w-[80px]">
                        {getFieldName(task.fieldId)}
                     </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {formatTaskDate(task)} • {task.description || 'Detay yok'}
                  </p>
                </div>
                <button className="h-8 w-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-400 hover:bg-green-100 hover:text-green-600 transition-colors">
                  <CheckCircle2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl border border-stone-100 border-dashed">
            <p className="text-stone-400 text-sm">Bekleyen görev bulunmuyor.</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-stone-800 mb-3">Tarlalarım Özet</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {fields.map(field => (
            <div key={field.id} className={`min-w-[160px] bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden ${field.seasonalWarning ? 'border-amber-300 bg-amber-50' : 'border-stone-100'}`}>
              <h3 className="font-bold text-stone-800 truncate">{field.name}</h3>
              <p className="text-xs text-green-600 font-medium mb-1">{field.cropType}</p>
              <div className="flex items-center gap-1 text-stone-400 text-xs">
                <MapPin size={12} />
                <span>{field.sizeDecares} Dönüm</span>
              </div>
              {field.seasonalWarning && (
                <div className="mt-2 w-2 h-2 rounded-full bg-amber-500 absolute top-3 right-3" />
              )}
            </div>
          ))}
          <button className="min-w-[100px] flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all">
            <Sprout size={20} className="mb-1" />
            <span className="text-xs font-medium">Ekle</span>
          </button>
        </div>
      </section>
    </div>
  );
};

// 2. Field Form (Used for Add & Edit) - kept same
interface FieldFormProps {
    onSave: (f: Field) => void;
    onCancel: () => void;
    defaultLocation: string;
    initialData?: Field;
}

const FieldForm = ({ onSave, onCancel, defaultLocation, initialData }: FieldFormProps) => {
  const [formData, setFormData] = useState<Partial<Field>>(initialData || {
    cropType: CropType.WHEAT,
    hasIrrigation: false,
    sizeDecares: 10,
    location: defaultLocation
  });
  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSizeError(null);

    // Validation
    if (!formData.name || !formData.location) return;
    if (!formData.sizeDecares || formData.sizeDecares <= 0) {
        setSizeError("Lütfen geçerli ve pozitif bir tarla büyüklüğü giriniz.");
        return;
    }

    onSave({
      id: initialData?.id || Date.now().toString(),
      name: formData.name,
      location: formData.location,
      sizeDecares: formData.sizeDecares,
      cropType: formData.cropType as CropType,
      hasIrrigation: formData.hasIrrigation || false,
      createdAt: initialData?.createdAt || Date.now(),
      seasonalWarning: initialData?.seasonalWarning // Preserve warning if editing
    });
  };

  return (
    <div className="p-4 pb-24 h-full bg-white flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6 mt-2">
         <h2 className="text-2xl font-bold text-stone-800">{initialData ? 'Tarlayı Düzenle' : 'Yeni Tarla Kaydı'}</h2>
         <button onClick={onCancel} className="p-2 bg-stone-100 rounded-full text-stone-500">
            <X size={20} />
         </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 flex-1">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Tarla Adı</label>
          <input 
            required
            type="text" 
            className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            placeholder="Örn: Aşağı Köy Tarlası"
            value={formData.name || ''}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Konum (Bölge/İlçe)</label>
          <CityDistrictSelector 
             value={formData.location || ""}
             onChange={(val) => setFormData({...formData, location: val})}
             placeholder="İl veya İlçe Seçiniz"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Boyut (Dönüm)</label>
            <input 
              type="number" 
              className={`w-full px-4 py-3 rounded-xl bg-stone-50 border focus:outline-none transition-all ${sizeError ? 'border-red-500 ring-1 ring-red-200' : 'border-stone-200 focus:border-green-500'}`}
              value={formData.sizeDecares}
              onChange={e => {
                  setFormData({...formData, sizeDecares: Number(e.target.value)});
                  if (Number(e.target.value) > 0) setSizeError(null);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Ürün Tipi</label>
            <select 
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:border-green-500 outline-none appearance-none"
              value={formData.cropType}
              onChange={e => setFormData({...formData, cropType: e.target.value as CropType})}
            >
              {Object.values(CropType).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {sizeError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-pulse">
                <AlertCircle size={16} />
                {sizeError}
            </div>
        )}

        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
          <div className="flex items-center gap-3">
            <Droplets className="text-blue-500" />
            <span className="font-medium text-stone-700">Sulama Sistemi Var mı?</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={formData.hasIrrigation}
                onChange={e => setFormData({...formData, hasIrrigation: e.target.checked})} 
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        <button 
          type="submit"
          className="w-full mt-auto bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <CheckCircle2 />
          {initialData ? 'Güncellemeleri Kaydet' : 'Tarlayı Kaydet'}
        </button>
      </form>
    </div>
  );
};

// 3. Soil Analysis Page
const SoilAnalysis = ({ 
  fields, 
  history, 
  onSaveAnalysis,
  tasks,
  onUpdateTasks
}: { 
  fields: Field[], 
  history: AnalysisRecord[],
  onSaveAnalysis: (rec: AnalysisRecord) => void;
  tasks: Task[];
  onUpdateTasks: (fieldId: string, newTasks: Task[], replace: boolean) => void;
}) => {
  const [view, setView] = useState<'new' | 'list' | 'result'>('list');
  const [selectedFieldId, setSelectedFieldId] = useState<string>(fields[0]?.id || '');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisRecord | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get analysis label (e.g., Analiz 1, Analiz 2)
  const getAnalysisLabel = (record: AnalysisRecord, allHistory: AnalysisRecord[]) => {
    // Sort oldest first to determine index
    const fieldRecords = allHistory
        .filter(r => r.fieldId === record.fieldId)
        .sort((a, b) => a.date - b.date);
    const index = fieldRecords.findIndex(r => r.id === record.id);
    return `Analiz ${index + 1}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!image || !selectedFieldId) return;
    setLoading(true);
    const field = fields.find(f => f.id === selectedFieldId);
    if (!field) return;

    const base64Data = image.split(',')[1];
    
    try {
      const data = await analyzeSoilImage(base64Data, field.cropType, field.sizeDecares);
      
      const newRecord: AnalysisRecord = {
        id: Date.now().toString(),
        date: Date.now(),
        fieldId: field.id,
        fieldName: field.name,
        cropType: field.cropType,
        result: data
      };
      
      onSaveAnalysis(newRecord);
      setCurrentResult(newRecord);
      setView('result');
      setImage(null);
    } catch (err) {
      // Handled inside analyzeSoilImage for alerts, or fallback
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCalendar = async () => {
      if (!currentResult) return;
      const field = fields.find(f => f.id === currentResult.fieldId);
      if (!field) return;

      const existingTasks = tasks.some(t => t.fieldId === field.id && !t.completed);
      let replace = false;

      if (existingTasks) {
          const confirm = window.confirm(
              `UYARI: "${field.name}" için zaten aktif bir zirai takvim bulunuyor.\n\n` + 
              "Mevcut takvimi bu yeni analiz sonuçlarına göre GÜNCELLEMEK (Eski görevleri silip yenilerini oluşturmak) istiyor musunuz?\n\n" +
              "Tamam: Evet, mevcut takvimi sil ve yenisini oluştur.\n" +
              "İptal: Hayır, işlemi iptal et."
          );
          if (!confirm) return;
          replace = true;
      }

      setCalendarLoading(true);
      try {
          const newTasks = await generateTasksFromAnalysis(field, currentResult.result);
          // Attach the specific analysis ID to these tasks for traceability
          const linkedTasks = newTasks.map(t => ({
              ...t,
              analysisId: currentResult.id
          }));
          
          onUpdateTasks(field.id, linkedTasks, replace);
          alert("Görevler takvime başarıyla eklendi ve analiz ile ilişkilendirildi!");
      } catch (error: any) {
          alert(error.message || "Takvim oluşturulurken bir hata oluştu.");
      } finally {
          setCalendarLoading(false);
      }
  };

  // View: Result Detail
  if (view === 'result' && currentResult) {
    const r = currentResult.result;
    const nutrientData = [
        { name: 'Azot', value: r.nitrogen === 'Low' ? 30 : r.nitrogen === 'Optimal' ? 70 : 100, color: '#3b82f6' },
        { name: 'Fosfor', value: r.phosphorus === 'Low' ? 30 : r.phosphorus === 'Optimal' ? 70 : 100, color: '#f97316' },
        { name: 'Potasyum', value: r.potassium === 'Low' ? 30 : r.potassium === 'Optimal' ? 70 : 100, color: '#8b5cf6' },
    ];

    const label = getAnalysisLabel(currentResult, history); // Even if it's new, it's in history state

    return (
        <div className="p-4 pb-24 animate-fade-in">
            <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setView('list')} className="p-2 -ml-2 rounded-full hover:bg-stone-100">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                   <h2 className="text-2xl font-bold text-stone-800">Analiz Sonucu</h2>
                   <span className="text-xs text-stone-400 font-medium">{label}</span>
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                <div className="flex justify-between items-start mb-4">
                   <div>
                       <h3 className="font-bold text-lg text-stone-800">{currentResult.fieldName}</h3>
                       <p className="text-xs text-stone-500">{new Date(currentResult.date).toLocaleDateString('tr-TR')}</p>
                   </div>
                   {r.idealPlantingTime && (
                       <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100 font-medium">
                           Ekim: {r.idealPlantingTime}
                       </span>
                   )}
                </div>

                <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie data={nutrientData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                        {nutrientData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip />
                    </PieChart>
                </ResponsiveContainer>
                </div>
                
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2"><Leaf size={16} /> Önerilen Gübre</h4>
                    <p className="text-green-700 text-lg font-bold">{r.calculatedFertilizerAmount}</p>
                </div>
                
                <div className="space-y-2 mb-6">{r.recommendations.map((rec, i) => <div key={i} className="flex gap-3 text-sm text-stone-600"><span className="font-bold">{i+1}.</span>{rec}</div>)}</div>

                <button 
                    onClick={handleAddToCalendar}
                    disabled={calendarLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                >
                    {calendarLoading ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
                    {calendarLoading ? 'Takvim Oluşturuluyor...' : 'Takvime Ekle'}
                </button>
            </div>
        </div>
    );
  }

  // View: New Analysis
  if (view === 'new') {
      return (
          <div className="p-4 pb-24 animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setView('list')} className="p-2 -ml-2 rounded-full hover:bg-stone-100"><ChevronLeft size={24} /></button>
                  <h2 className="text-2xl font-bold text-stone-800">Yeni Analiz</h2>
              </div>
              <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
                      <label className="block text-sm font-medium text-stone-700 mb-2">Tarla Seçimi</label>
                      <select className="w-full px-4 py-3 rounded-xl bg-stone-50 border outline-none" value={selectedFieldId} onChange={(e) => setSelectedFieldId(e.target.value)}>
                          {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                  </div>
                  <div className="border-2 border-dashed border-stone-300 rounded-2xl bg-stone-50 p-8 flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      {image ? <img src={image} className="h-48 w-full object-cover rounded-lg" /> : <><Camera className="text-stone-400 mb-4" size={32} /><h3 className="font-bold text-stone-700">Rapor Yükle</h3></>}
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                  <button onClick={startAnalysis} disabled={!image || loading} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex justify-center gap-2">{loading ? <Loader2 className="animate-spin" /> : <Upload />} Analiz Et</button>
              </div>
          </div>
      )
  }

  // View: History List
  return (
    <div className="p-4 pb-24 animate-fade-in">
        <h2 className="text-2xl font-bold text-stone-800 mb-6">Analiz Geçmişi</h2>
        <button onClick={() => setView('new')} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex justify-center gap-2 mb-6"><Camera size={20} /> Yeni Analiz</button>
        <div className="space-y-3">
            {history.length === 0 ? <div className="text-center py-10 text-stone-400">Analiz bulunamadı.</div> : 
            history.sort((a,b) => b.date - a.date).map(rec => {
                const label = getAnalysisLabel(rec, history);
                return (
                    <div key={rec.id} onClick={() => { setCurrentResult(rec); setView('result'); }} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer hover:bg-stone-50">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-stone-800">{rec.fieldName}</h4>
                                <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{label}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                                <Clock size={12} />
                                <span>{new Date(rec.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                        <ChevronLeft size={16} className="text-stone-300 rotate-180" />
                    </div>
                );
            })}
        </div>
    </div>
  );
};

// 4. Calendar Page (Enhanced with Field Filter)
const CalendarView = ({ tasks, fields }: { tasks: Task[], fields: Field[] }) => {
  const [selectedFieldId, setSelectedFieldId] = useState<string>('all');

  const filteredTasks = selectedFieldId === 'all' 
    ? tasks 
    : tasks.filter(t => t.fieldId === selectedFieldId);

  const sortedTasks = filteredTasks.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Helper to get field name by ID
  const getFieldName = (id: string) => fields.find(f => f.id === id)?.name || 'Bilinmeyen Tarla';

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-stone-800">Zirai Takvim</h2>
      </div>

      <div className="bg-white p-2 rounded-xl border border-stone-200 mb-6 flex items-center gap-2">
         <Filter size={18} className="text-stone-400 ml-2" />
         <select 
            className="w-full bg-transparent p-2 text-sm font-medium text-stone-700 outline-none"
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
         >
            <option value="all">Tüm Tarlalar</option>
            {fields.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
            ))}
         </select>
      </div>
      
      <div className="space-y-4">
        {sortedTasks.map(task => {
          const isPast = new Date(task.date) < new Date();
          const fieldName = getFieldName(task.fieldId);
          const isRange = task.endDate && task.date !== task.endDate;

          return (
            <div key={task.id} className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${
              task.type === 'IRRIGATION' ? 'border-blue-500' :
              task.type === 'FERTILIZER' ? 'border-orange-500' : 
              task.type === 'HARVEST' ? 'border-yellow-500' : 
              task.type === 'PLANTING' ? 'border-emerald-600' :
              'border-green-500'
            } ${isPast ? 'opacity-60' : ''}`}>
               <div className="flex justify-between items-start">
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase text-stone-400 tracking-wider">
                           {formatTaskDate(task)}
                        </span>
                        <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-bold truncate">
                            {fieldName}
                        </span>
                        {task.analysisId && (
                           <span className="text-[10px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded border border-blue-100">
                               Analiz Bazlı
                           </span>
                        )}
                        {task.type === 'PLANTING' && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Ekim Dönemi</span>}
                        {task.type === 'HARVEST' && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold">Hasat Dönemi</span>}
                    </div>
                    <h3 className="font-bold text-stone-800 text-lg">{task.title}</h3>
                    <p className="text-sm text-stone-500 mt-1">{task.description}</p>
                  </div>
                  <div className={`p-2 rounded-lg shrink-0 ${
                     task.type === 'IRRIGATION' ? 'bg-blue-50 text-blue-600' :
                     task.type === 'FERTILIZER' ? 'bg-orange-50 text-orange-600' : 
                     task.type === 'HARVEST' ? 'bg-yellow-50 text-yellow-600' :
                     task.type === 'PLANTING' ? 'bg-emerald-50 text-emerald-600' :
                     'bg-green-50 text-green-600'
                  }`}>
                    {task.type === 'IRRIGATION' ? <Droplets size={20} /> : 
                     task.type === 'HARVEST' ? <Sprout size={20} className="text-yellow-600" /> :
                     task.type === 'PLANTING' ? <Sprout size={20} className="text-emerald-600" /> :
                     <Sprout size={20} />}
                  </div>
               </div>
            </div>
          );
        })}
        {sortedTasks.length === 0 && (
           <div className="text-center py-12">
             <Calendar size={48} className="mx-auto text-stone-300 mb-4" />
             <p className="text-stone-500">
                {selectedFieldId === 'all' ? 'Henüz planlanmış bir görev yok.' : 'Bu tarla için planlanmış görev yok.'}
             </p>
           </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Orchestrator ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [fields, setFields] = useState<Field[]>(INITIAL_FIELDS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>(INITIAL_HISTORY);
  const [isLoading, setIsLoading] = useState(true);
  
  // Location States
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Edit State
  const [editingField, setEditingField] = useState<Field | null>(null);

  useEffect(() => {
    if (userLocation) {
      getWeatherForLocation(userLocation).then(setWeather);
    }
  }, [userLocation]);

  useEffect(() => {
    // App Initialization
    setTimeout(() => {
      // Mock Data
      const mockField: Field = {
        id: '1',
        name: 'Kuzey Bahçesi',
        location: 'Tekirdağ, Hayrabolu',
        sizeDecares: 25,
        cropType: CropType.SUNFLOWER,
        hasIrrigation: true,
        createdAt: Date.now()
      };
      setFields([mockField]);
      
      const mockTasks: Task[] = [
        { id: '101', fieldId: '1', title: 'Damla Sulama Kontrolü', date: new Date().toISOString(), type: 'IRRIGATION', completed: false, description: 'Sistem basıncını kontrol et.' },
        { id: '102', fieldId: '1', title: 'Ot İlacı Uygulaması', date: new Date(Date.now() + 86400000 * 2).toISOString(), type: 'PESTICIDE', completed: false, description: 'Geniş yapraklı otlar için.' }
      ];
      setTasks(mockTasks);
      
      if (!userLocation) {
        setShowLocationSelector(true);
      }
      
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleLocationSelect = (location: string) => {
    setUserLocation(location);
    setShowLocationSelector(false);
  };

  const handleSaveField = (field: Field) => {
    if (editingField) {
        // Update Existing
        setFields(prev => prev.map(f => f.id === field.id ? field : f));
        setEditingField(null);
        setActiveTab('fields');
        // Note: In a real app, we might want to regenerate the schedule here if key factors changed.
    } else {
        // Create New
        setFields(prev => prev.concat(field));
        setActiveTab('fields');
        
        // Generate initial schedule automatically
        generateSchedule(field.id, field.cropType, field.hasIrrigation, new Date(), field.location)
        .then(result => {
            setTasks(prev => [...prev, ...result.tasks]);
            if (result.warning) {
                setFields(prevFields => prevFields.map(f => 
                    f.id === field.id ? { ...f, seasonalWarning: result.warning } : f
                ));
            }
        });
    }
  };

  const handleDeleteField = (id: string) => {
      if (window.confirm("Bu tarlayı ve ilişkili tüm takvim/analiz verilerini silmek istediğinize emin misiniz?")) {
          setFields(prev => prev.filter(f => f.id !== id));
          setTasks(prev => prev.filter(t => t.fieldId !== id));
          setAnalysisHistory(prev => prev.filter(h => h.fieldId !== id));
      }
  };

  const handleUpdateTasks = (fieldId: string, newTasks: Task[], replace: boolean) => {
    setTasks(prev => {
        if (replace) {
            // Remove old tasks for this field and add new ones
            return [...prev.filter(t => t.fieldId !== fieldId), ...newTasks];
        } else {
            // Append new tasks
            return [...prev, ...newTasks];
        }
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-50 text-green-600">
        <Sprout size={48} className="animate-bounce mb-4" />
        <p className="font-medium text-stone-600">Dijital Çiftçi Yükleniyor...</p>
      </div>
    );
  }

  // Determine if we show the form
  const showFieldForm = activeTab === 'add' || editingField !== null;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 mx-auto max-w-md shadow-2xl overflow-hidden relative">
      {/* Location Selector Overlay */}
      {showLocationSelector && (
        <LocationSelector 
          currentLocation={userLocation} 
          onSelect={handleLocationSelect} 
          onCancel={userLocation ? () => setShowLocationSelector(false) : undefined} 
        />
      )}

      {/* Main Content */}
      <main className="h-full overflow-y-auto no-scrollbar relative">
        {/* Helper button to change location if we are on home */}
        {activeTab === 'home' && !showLocationSelector && (
            <button 
                onClick={() => setShowLocationSelector(true)} 
                className="absolute top-5 right-4 z-10 text-stone-400 hover:text-green-600 p-2 bg-white/50 rounded-full"
            >
                <Edit2 size={16} />
            </button>
        )}

        {activeTab === 'home' && <HomeDashboard fields={fields} tasks={tasks} userLocation={userLocation || 'Bilinmiyor'} weather={weather} />}
        
        {activeTab === 'fields' && !editingField && (
          <div className="p-4 pb-24 animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-stone-800">Kayıtlı Tarlalar</h2>
            {fields.map(f => (
               <div key={f.id} className={`bg-white p-4 mb-4 rounded-xl border shadow-sm flex flex-col gap-2 ${f.seasonalWarning ? 'border-amber-300 bg-amber-50' : 'border-stone-100'}`}>
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-stone-800">{f.name}</h3>
                        <div className="flex items-center gap-1 text-stone-500 text-sm">
                            <MapPin size={12} />
                            <span>{f.location}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setEditingField(f)}
                            className="p-2 bg-stone-100 text-stone-500 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => handleDeleteField(f.id)}
                            className="p-2 bg-stone-100 text-stone-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                 </div>
                 
                 <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-100/50">
                    <span className="font-bold text-green-600 text-sm">{f.sizeDecares} Dönüm</span>
                    <span className="text-xs font-medium bg-stone-100 px-2 py-1 rounded text-stone-600">{f.cropType}</span>
                 </div>

                 {f.seasonalWarning && (
                     <div className="mt-2 bg-amber-100 p-2 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                         <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                         <span>{f.seasonalWarning}</span>
                     </div>
                 )}
               </div>
            ))}
            {fields.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-xl">
                    <p className="text-stone-400">Henüz kayıtlı tarla yok.</p>
                </div>
            )}
            <button onClick={() => setActiveTab('add')} className="w-full py-4 bg-stone-100 text-stone-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 border border-transparent rounded-xl font-bold mt-4 transition-all">
                + Yeni Tarla Ekle
            </button>
          </div>
        )}

        {showFieldForm && (
            <FieldForm 
                onSave={handleSaveField} 
                onCancel={() => {
                    setEditingField(null);
                    if (activeTab === 'add') setActiveTab('fields');
                }} 
                defaultLocation={userLocation || ''} 
                initialData={editingField || undefined}
            />
        )}

        {activeTab === 'calendar' && <CalendarView tasks={tasks} fields={fields} />}
        {activeTab === 'analysis' && 
          <SoilAnalysis 
            fields={fields} 
            history={analysisHistory} 
            onSaveAnalysis={(r) => setAnalysisHistory(prev => [r, ...prev])} 
            tasks={tasks}
            onUpdateTasks={handleUpdateTasks}
          />
        }
      </main>

      {!showFieldForm && <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />}
    </div>
  );
};

export default App;