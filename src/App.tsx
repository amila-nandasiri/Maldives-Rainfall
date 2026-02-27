import React, { useEffect, useState, useMemo } from 'react';
import { 
  CloudRain, 
  Droplets, 
  Calendar, 
  MapPin, 
  ArrowUpRight, 
  RefreshCw,
  Waves,
  Clock,
  ChevronDown,
  Search
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { WeatherResponse, City } from './types';
import { cn } from './utils';
import { MALDIVES_CITIES } from './constants';

export default function App() {
  const [selectedCity, setSelectedCity] = useState<City>(MALDIVES_CITIES[0]);
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async (city: City) => {
    try {
      setRefreshing(true);
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=precipitation_sum&timezone=auto&past_days=7&forecast_days=7`;
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Weather service error: ${response.status}`);
      const result = await response.json();
      if (!result.daily) throw new Error('Invalid data format received');

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(selectedCity);
  }, [selectedCity]);

  const filteredCities = useMemo(() => {
    return MALDIVES_CITIES.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.atoll?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const cityLocalTime = useMemo(() => {
    if (!data) return currentTime;
    const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
    return new Date(utc + (data.utc_offset_seconds * 1000));
  }, [currentTime, data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.daily.time.map((time, index) => ({
      date: time,
      amount: data.daily.precipitation_sum[index],
      formattedDate: format(parseISO(time), 'MMM dd'),
      dayName: format(parseISO(time), 'EEE'),
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const todayStr = format(cityLocalTime, 'yyyy-MM-dd');
    let todayIndex = chartData.findIndex(d => d.date === todayStr);
    if (todayIndex === -1) todayIndex = 7;

    const todayData = chartData[todayIndex];
    const weeklyData = chartData.slice(Math.max(0, todayIndex - 6), todayIndex + 1);
    const total = weeklyData.reduce((acc, curr) => acc + curr.amount, 0);
    const max = Math.max(...chartData.map(d => d.amount));
    const yesterday = todayIndex > 0 ? chartData[todayIndex - 1].amount : 0;

    return { 
      total, 
      avg: total / weeklyData.length, 
      max, 
      today: todayData?.amount ?? 0, 
      trend: (todayData?.amount ?? 0) >= yesterday ? 'up' : 'down',
      todayStr
    };
  }, [chartData, cityLocalTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-teal-100">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200">
              <Waves className="text-white w-7 h-7" />
            </div>
            <div className="relative">
              <button onClick={() => setIsCityMenuOpen(!isCityMenuOpen)} className="flex flex-col items-start group">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-bold group-hover:text-teal-600 transition-colors">{selectedCity.name}</h1>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isCityMenuOpen && "rotate-180")} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <MapPin className="w-3 h-3 text-teal-500" />
                  <span>{selectedCity.atoll} Atoll</span>
                </div>
              </button>
              <AnimatePresence>
                {isCityMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsCityMenuOpen(false)} />
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-40 max-h-[400px] overflow-y-auto">
                      <div className="px-3 py-2 mb-1 sticky top-0 bg-white z-10">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search city..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      {filteredCities.map((city) => (
                        <button
                          key={city.name}
                          onClick={() => { setSelectedCity(city); setIsCityMenuOpen(false); }}
                          className={cn("w-full px-4 py-2.5 text-left text-sm flex items-center justify-between", selectedCity.name === city.name ? "bg-teal-50 text-teal-700 font-semibold" : "hover:bg-slate-50 text-slate-600")}
                        >
                          <span>{city.name}</span>
                          <span className="text-[10px] uppercase opacity-50">{city.atoll}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Clock className="w-4 h-4 text-teal-500" />
                <span className="tabular-nums">{format(cityLocalTime, 'HH:mm:ss')}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Local Time</span>
            </div>
            <button onClick={() => fetchData(selectedCity)} disabled={refreshing} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-100">
              <RefreshCw className={cn("w-5 h-5 text-slate-600", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={() => fetchData(selectedCity)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Today's Rainfall" value={`${stats?.today?.toFixed(1) ?? '0.0'} mm`} icon={<CloudRain />} trend={stats?.trend as any} color="teal" />
              <StatCard title="Weekly Total" value={`${stats?.total?.toFixed(1) ?? '0.0'} mm`} icon={<Droplets />} color="blue" />
              <StatCard title="Daily Average" value={`${stats?.avg?.toFixed(1) ?? '0.0'} mm`} icon={<Calendar />} color="indigo" />
              <StatCard title="Peak Rainfall" value={`${stats?.max?.toFixed(1) ?? '0.0'} mm`} icon={<ArrowUpRight />} color="slate" />
            </div>
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold mb-8">Rainfall Trends</h2>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/><stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} unit="mm" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={3} fill="url(#colorRain)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold mb-6">Daily Breakdown</h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {[...chartData].reverse().map((day) => (
                  <div key={day.date} className={cn("flex items-center justify-between p-3 rounded-2xl", day.date === stats?.todayStr ? "bg-teal-50 border border-teal-100" : "hover:bg-slate-50")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", day.date === stats?.todayStr ? "bg-teal-600 text-white" : "bg-slate-50 text-slate-400")}>
                        {day.amount > 5 ? <CloudRain size={20} /> : <Droplets size={20} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{day.dayName}, {day.formattedDate}</p>
                        <p className="text-xs text-slate-500">{day.date === stats?.todayStr ? 'Today' : (new Date(day.date) > cityLocalTime ? 'Forecast' : '')}</p>
                      </div>
                    </div>
                    <p className="font-bold text-sm">{day.amount.toFixed(1)} mm</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: any) {
  const colors: any = { teal: 'bg-teal-50 text-teal-600', blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600', slate: 'bg-slate-50 text-slate-600' };
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>{icon}</div>
        {trend && <div className={cn("px-2 py-1 rounded-full text-[10px] font-bold", trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{trend === 'up' ? 'Rising' : 'Falling'}</div>}
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload?.[0]) {
    return (
      <div className="bg-white p-4 shadow-xl rounded-2xl border border-slate-100">
        <p className="text-xs font-bold text-slate-400 mb-2">{label}</p>
        <p className="text-lg font-bold">{payload[0].value.toFixed(1)} mm</p>
      </div>
    );
  }
  return null;
}
