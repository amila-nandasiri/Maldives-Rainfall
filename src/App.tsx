import React, { useEffect, useState, useMemo } from 'react';
import { 
  CloudRain, 
  Droplets, 
  Calendar, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
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
import { format, parseISO, addSeconds } from 'date-fns';
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
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async (city: City) => {
    try {
      setRefreshing(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const url = `/api/weather?latitude=${city.lat}&longitude=${city.lon}&past_days=7&forecast_days=7`;
      
      const response = await fetch(url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server returned non-JSON response (${response.status}).`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Weather service error: ${response.status}`);
      }
      
      if (!result.daily || !result.daily.precipitation_sum) {
        throw new Error('Invalid data format received');
      }

      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(selectedCity);
  }, [selectedCity]);

  // Calculate local time for the selected city
  const cityLocalTime = useMemo(() => {
    if (!data) return currentTime;
    // Open-Meteo returns utc_offset_seconds
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
    
    const todayStr = '2026-02-26';
    const todayIndex = chartData.findIndex(d => d.date === todayStr);
    
    // If today is not found, we might be in a different timezone or the API returned different range
    // But based on the request, we force Feb 26 as today.
    const todayData = todayIndex !== -1 ? chartData[todayIndex] : chartData[chartData.length - 1];
    
    // Calculate weekly stats based on the 7 days ending today (including today)
    const weeklyData = todayIndex !== -1 
      ? chartData.slice(Math.max(0, todayIndex - 6), todayIndex + 1)
      : chartData.slice(-7);

    const total = weeklyData.reduce((acc, curr) => acc + curr.amount, 0);
    const avg = total / weeklyData.length;
    const max = Math.max(...chartData.map(d => d.amount)); // Peak in the whole visible range
    const today = todayData.amount;
    
    const yesterdayData = todayIndex > 0 ? chartData[todayIndex - 1] : null;
    const yesterday = yesterdayData?.amount ?? 0;
    const trend = today >= yesterday ? 'up' : 'down';

    return { total, avg, max, today, trend, todayIndex };
  }, [chartData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="w-8 h-8 text-teal-600" />
          </motion.div>
          <p className="text-slate-500 font-medium animate-pulse">Loading tropical data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-teal-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200 shrink-0">
              <Waves className="text-white w-7 h-7" />
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setIsCityMenuOpen(!isCityMenuOpen)}
                className="flex flex-col items-start group transition-all"
              >
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-bold tracking-tight group-hover:text-teal-600 transition-colors">
                    {selectedCity.name}
                  </h1>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isCityMenuOpen && "rotate-180")} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <MapPin className="w-3 h-3 text-teal-500" />
                  <span>{selectedCity.atoll} Atoll, Maldives</span>
                </div>
              </button>

              <AnimatePresence>
                {isCityMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsCityMenuOpen(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-40 max-h-[400px] overflow-y-auto custom-scrollbar"
                    >
                      <div className="px-3 py-2 mb-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search city..." 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      {MALDIVES_CITIES.map((city) => (
                        <button
                          key={city.name}
                          onClick={() => {
                            setSelectedCity(city);
                            setIsCityMenuOpen(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors",
                            selectedCity.name === city.name 
                              ? "bg-teal-50 text-teal-700 font-semibold" 
                              : "hover:bg-slate-50 text-slate-600"
                          )}
                        >
                          <span>{city.name}</span>
                          <span className="text-[10px] uppercase tracking-wider opacity-50">{city.atoll}</span>
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

            <button 
              onClick={() => fetchData(selectedCity)}
              disabled={refreshing}
              className="p-3 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 disabled:opacity-50 border border-slate-100"
            >
              <RefreshCw className={cn("w-5 h-5 text-slate-600", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Stats Overview */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Today's Rainfall"
                value={`${stats?.today?.toFixed(1) ?? '0.0'} mm`}
                icon={<CloudRain className="w-5 h-5" />}
                trend={stats?.trend}
                color="teal"
              />
              <StatCard 
                title="Weekly Total"
                value={`${stats?.total?.toFixed(1) ?? '0.0'} mm`}
                icon={<Droplets className="w-5 h-5" />}
                color="blue"
              />
              <StatCard 
                title="Daily Average"
                value={`${stats?.avg?.toFixed(1) ?? '0.0'} mm`}
                icon={<Calendar className="w-5 h-5" />}
                color="indigo"
              />
              <StatCard 
                title="Peak Rainfall"
                value={`${stats?.max?.toFixed(1) ?? '0.0'} mm`}
                icon={<ArrowUpRight className="w-5 h-5" />}
                color="slate"
              />
            </div>

            {/* Main Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold">Rainfall Trends</h2>
                  <p className="text-sm text-slate-500">Precipitation overview (Past 7 days + Forecast)</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                  <span className="px-3 py-1 text-xs font-semibold bg-white rounded-md shadow-sm text-teal-600">Daily</span>
                </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="formattedDate" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      unit="mm"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#0d9488" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRain)" 
                      animationDuration={1500}
                    />
                    {/* Reference line for Today */}
                    {stats?.todayIndex !== undefined && stats.todayIndex !== -1 && (
                      <rect
                        x={0}
                        y={0}
                        width="100%"
                        height="100%"
                        fill="transparent"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Daily Breakdown */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
            >
              <h2 className="text-xl font-bold mb-6">Daily Breakdown</h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {chartData.slice().reverse().map((day) => (
                  <div 
                    key={day.date} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl transition-colors group",
                      day.date === '2026-02-26' ? "bg-teal-50/50 border border-teal-100" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        day.date === '2026-02-26' ? "bg-teal-600 text-white" : (day.amount > 5 ? "bg-teal-50 text-teal-600" : "bg-slate-50 text-slate-400")
                      )}>
                        {day.date === '2026-02-26' ? <Waves className="w-5 h-5" /> : (day.amount > 5 ? <CloudRain className="w-5 h-5" /> : <Droplets className="w-5 h-5" />)}
                      </div>
                      <div>
                        <p className={cn("font-semibold text-sm", day.date === '2026-02-26' && "text-teal-900")}>
                          {day.dayName}, {day.formattedDate}
                        </p>
                        <p className="text-xs text-slate-500">
                          {day.date === '2026-02-26' ? 'Today' : day.date === '2026-02-25' ? 'Yesterday' : (new Date(day.date) > new Date('2026-02-26') ? 'Forecast' : '')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{day.amount.toFixed(1)} mm</p>
                      <div className="h-1 w-12 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((day.amount / (stats?.max || 1)) * 100, 100)}%` }}
                          className="h-full bg-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-teal-50 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-xs text-teal-800 leading-relaxed">
                  The Maldives experiences two main seasons: the dry Northeast Monsoon and the wet Southwest Monsoon. Current data reflects local precipitation patterns.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Waves className="w-5 h-5" />
            <span className="text-sm font-medium">Maldives Rainfall Tracker</span>
          </div>
          <p className="text-xs text-slate-400">
            Data provided by Open-Meteo API. Coordinates: {selectedCity.lat}° N, {selectedCity.lon}° E.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: 'up' | 'down';
  color: 'teal' | 'blue' | 'indigo' | 'slate';
}) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600 shadow-teal-100/50',
    blue: 'bg-blue-50 text-blue-600 shadow-blue-100/50',
    indigo: 'bg-indigo-50 text-indigo-600 shadow-indigo-100/50',
    slate: 'bg-slate-50 text-slate-600 shadow-slate-100/50',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", colors[color])}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
            trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend === 'up' ? 'Rising' : 'Falling'}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-xl rounded-2xl border border-slate-100">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          <p className="text-lg font-bold">{payload[0].value.toFixed(1)} <span className="text-sm font-normal text-slate-500">mm</span></p>
        </div>
      </div>
    );
  }
  return null;
}
