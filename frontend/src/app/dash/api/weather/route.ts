import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Mons, Belgium — city not exposed to client
const LAT = 50.454;
const LON = 3.952;

const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Icy fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌧️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Showers", icon: "🌧️" },
  82: { label: "Heavy showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm+hail", icon: "⛈️" },
  99: { label: "Heavy thunderstorm", icon: "⛈️" },
};

function wmo(code: number) {
  return WMO_CODES[code] ?? { label: "Unknown", icon: "🌡️" };
}

export async function GET() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
      `&timezone=Europe%2FBrussels&forecast_days=5`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });

    const data = await res.json();
    const cur = data.current;
    const daily = data.daily;

    const current = {
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m as number,
      windKph: Math.round(cur.wind_speed_10m),
      ...wmo(cur.weather_code as number),
    };

    const forecast = (daily.time as string[]).slice(0, 5).map((date: string, i: number) => ({
      date,
      high: Math.round((daily.temperature_2m_max as number[])[i]),
      low: Math.round((daily.temperature_2m_min as number[])[i]),
      precipChance: (daily.precipitation_probability_max as number[])[i] ?? 0,
      ...wmo((daily.weather_code as number[])[i]),
    }));

    return NextResponse.json({ current, forecast });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
