export interface City {
  name: string;
  lat: number;
  lon: number;
  atoll?: string;
}

export interface DailyData {
  time: string[];
  precipitation_sum: number[];
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    precipitation_sum: string;
  };
  daily: DailyData;
}

export interface RainfallPoint {
  date: string;
  amount: number;
  formattedDate: string;
}
