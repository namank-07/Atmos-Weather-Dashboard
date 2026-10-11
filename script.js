const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const elements = {
  cityInput: document.querySelector("#cityInput"),
  searchButton: document.querySelector("#searchButton"),
  refreshButton: document.querySelector("#refreshButton"),
  searchResults: document.querySelector("#searchResults"),
  statusMessage: document.querySelector("#statusMessage"),
  weatherContent: document.querySelector("#weatherContent"),
  locationName: document.querySelector("#locationName"),
  localDate: document.querySelector("#localDate"),
  conditionBadge: document.querySelector("#conditionBadge"),
  weatherGlyph: document.querySelector("#weatherGlyph"),
  temperature: document.querySelector("#temperature"),
  conditionText: document.querySelector("#conditionText"),
  feelsLike: document.querySelector("#feelsLike"),
  weatherSummary: document.querySelector("#weatherSummary"),
  daylightLabel: document.querySelector("#daylightLabel"),
  humidity: document.querySelector("#humidity"),
  windSpeed: document.querySelector("#windSpeed"),
  windDirection: document.querySelector("#windDirection"),
  metricFeelsLike: document.querySelector("#metricFeelsLike"),
  precipitation: document.querySelector("#precipitation"),
  hourlyForecast: document.querySelector("#hourlyForecast")
};

let activeLocation = null;
let searchRequestNumber = 0;

const weatherDescriptions = [
  { codes: [0], label: "Clear sky", glyph: "☀", summary: "Clear skies overhead. A lovely time to enjoy the outdoors." },
  { codes: [1], label: "Mainly clear", glyph: "🌤", summary: "Mostly clear conditions with a little cloud cover." },
  { codes: [2], label: "Partly cloudy", glyph: "⛅", summary: "A mix of sunshine and clouds across the sky." },
  { codes: [3], label: "Overcast", glyph: "☁", summary: "Clouds are covering most of the sky today." },
  { codes: [45, 48], label: "Foggy", glyph: "🌫", summary: "Reduced visibility is possible. Take care while travelling." },
  { codes: [51, 53, 55], label: "Drizzle", glyph: "🌦", summary: "Light drizzle may make surfaces damp and slippery." },
  { codes: [56, 57], label: "Freezing drizzle", glyph: "🌧", summary: "Freezing drizzle is possible. Watch for slippery surfaces." },
  { codes: [61, 63, 65], label: "Rain", glyph: "🌧", summary: "Rain is in the forecast. Consider carrying an umbrella." },
  { codes: [66, 67], label: "Freezing rain", glyph: "🌧", summary: "Freezing rain can create icy conditions. Travel carefully." },
  { codes: [71, 73, 75, 77], label: "Snowfall", glyph: "❄", summary: "Snow is falling or expected. Dress for cold conditions." },
  { codes: [80, 81, 82], label: "Rain showers", glyph: "🌦", summary: "Showers may come and go. Keep an umbrella nearby." },
  { codes: [85, 86], label: "Snow showers", glyph: "🌨", summary: "Snow showers may pass through the area." },
  { codes: [95], label: "Thunderstorm", glyph: "⛈", summary: "Thunderstorms are possible. Seek shelter if they develop." },
  { codes: [96, 99], label: "Thunderstorm with hail", glyph: "⛈", summary: "Thunderstorms with possible hail. Stay sheltered in severe conditions." }
];

function getWeatherInfo(code, isDay = true) {
  const info = weatherDescriptions.find((item) => item.codes.includes(Number(code)));
  if (!info) {
    return { label: "Conditions unavailable", glyph: "◌", summary: "Weather details are available for this location." };
  }
  if (Number(code) === 0 && !isDay) return { ...info, label: "Clear night", glyph: "☾", summary: "Clear skies overhead. The evening looks calm." };
  if (Number(code) === 1 && !isDay) return { ...info, glyph: "☾", summary: "Mostly clear skies through the night." };
  return info;
}

function setStatus(message, type = "") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = type ? `status-message ${type}` : "status-message";
}

function setLoading(isLoading, message = "") {
  elements.searchButton.disabled = isLoading;
  elements.searchButton.textContent = isLoading ? "Loading…" : "Search ↗";
  elements.refreshButton.disabled = isLoading;
  if (message) setStatus(message);
}

function safeNumber(value, digits = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function cardinalDirection(degrees) {
  if (!Number.isFinite(Number(degrees))) return "Wind direction unavailable";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `From ${directions[Math.round(Number(degrees) / 45) % 8]} (${Math.round(Number(degrees))}°)`;
}

function formatLocalDateTime(value) {
  if (!value) return "Local time unavailable";
  const [datePart, timePart = ""] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC"
  }).format(date);
  const displayHour = hour % 12 || 12;
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${dateLabel} · ${displayHour}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function formatHour(value) {
  if (!value || !value.includes("T")) return "—";
  const hour = Number(value.split("T")[1].split(":")[0]);
  return `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;
}

function makeCityOption(place) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "city-option";
  button.setAttribute("role", "option");
  const copy = document.createElement("span");
  const name = document.createElement("strong");
  name.textContent = place.name;
  const detail = document.createElement("small");
  detail.textContent = [place.admin1, place.country].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(", ");
  copy.append(name, detail);
  const arrow = document.createElement("span");
  arrow.className = "city-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  button.append(copy, arrow);
  button.addEventListener("click", () => {
    elements.cityInput.value = place.name;
    elements.searchResults.hidden = true;
    loadWeather(place);
  });
  return button;
}

async function searchCities() {
  const query = elements.cityInput.value.trim();
  if (query.length < 2) {
    setStatus("Enter at least two letters to search for a city.", "error");
    elements.searchResults.hidden = true;
    return;
  }

  const requestNumber = ++searchRequestNumber;
  elements.searchButton.disabled = true;
  elements.searchButton.textContent = "Searching…";
  setStatus("Finding matching cities…");

  try {
    const url = new URL(GEOCODING_URL);
    url.search = new URLSearchParams({
      name: query,
      count: "10",
      language: "en",
      format: "json"
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("City search is temporarily unavailable.");
    const data = await response.json();
    if (requestNumber !== searchRequestNumber) return;

    const places = Array.isArray(data.results) ? data.results : [];
    elements.searchResults.replaceChildren();
    if (!places.length) {
      elements.searchResults.hidden = true;
      setStatus(`No cities found for “${query}”. Try another spelling.`, "error");
      return;
    }

    places.forEach((place) => elements.searchResults.append(makeCityOption(place)));
    elements.searchResults.hidden = false;
    setStatus(`Found ${places.length} location${places.length === 1 ? "" : "s"}. Select one to load its weather.`);
  } catch (error) {
    if (requestNumber === searchRequestNumber) {
      elements.searchResults.hidden = true;
      setStatus(error.message || "Could not search cities. Check your internet connection.", "error");
    }
  } finally {
    if (requestNumber === searchRequestNumber) {
      elements.searchButton.disabled = false;
      elements.searchButton.textContent = "Search ↗";
    }
  }
}

function renderHourly(hourly) {
  elements.hourlyForecast.replaceChildren();
  const times = hourly?.time || [];
  const temperatures = hourly?.temperature_2m || [];
  const codes = hourly?.weather_code || [];
  const rain = hourly?.precipitation_probability || [];
  const currentTime = hourly?.time?.[0];
  let startIndex = 0;

  if (activeLocation && currentTime) {
    const now = new Date();
    const localCurrentHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:00`;
    const exact = times.findIndex((time) => time >= localCurrentHour);
    if (exact >= 0) startIndex = exact;
  }

  for (let offset = startIndex; offset < Math.min(startIndex + 6, times.length); offset += 1) {
    const info = getWeatherInfo(codes[offset], true);
    const card = document.createElement("article");
    card.className = "hour-card";

    const time = document.createElement("div");
    time.className = "hour-time";
    time.textContent = offset === startIndex ? "Now" : formatHour(times[offset]);

    const glyph = document.createElement("div");
    glyph.className = "hour-glyph";
    glyph.textContent = info.glyph;
    glyph.setAttribute("aria-label", info.label);

    const temperature = document.createElement("strong");
    temperature.className = "hour-temp";
    temperature.textContent = `${safeNumber(temperatures[offset])}°`;

    const precipitation = document.createElement("div");
    precipitation.className = "hour-rain";
    precipitation.textContent = rain[offset] == null ? "— rain" : `☂ ${safeNumber(rain[offset])}%`;

    card.append(time, glyph, temperature, precipitation);
    elements.hourlyForecast.append(card);
  }

  if (!elements.hourlyForecast.children.length) {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = "Hourly forecast is not available for this location.";
    elements.hourlyForecast.append(note);
  }
}

async function loadWeather(place) {
  activeLocation = place;
  elements.weatherContent.hidden = true;
  setLoading(true, `Loading weather for ${place.name}…`);
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    forecast_days: "2",
    timezone: "auto"
  });

  try {
    const response = await fetch(`${FORECAST_URL}?${params.toString()}`);
    if (!response.ok) throw new Error("Weather data could not be loaded.");
    const data = await response.json();
    if (!data.current) throw new Error("No current weather data was returned for this city.");

    const current = data.current;
    const info = getWeatherInfo(current.weather_code, Boolean(current.is_day));
    const locationLabel = [place.name, place.admin1, place.country].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join(", ");

    elements.locationName.textContent = locationLabel;
    elements.localDate.textContent = formatLocalDateTime(current.time);
    elements.conditionBadge.textContent = info.label;
    elements.weatherGlyph.textContent = info.glyph;
    elements.weatherGlyph.setAttribute("aria-label", info.label);
    elements.temperature.textContent = safeNumber(current.temperature_2m);
    elements.conditionText.textContent = info.label;
    elements.feelsLike.textContent = `Feels like ${safeNumber(current.apparent_temperature)}°C`;
    elements.weatherSummary.textContent = info.summary;
    elements.daylightLabel.textContent = current.is_day ? "Daytime conditions" : "Night-time conditions";
    elements.humidity.textContent = `${safeNumber(current.relative_humidity_2m)}%`;
    elements.windSpeed.textContent = `${safeNumber(current.wind_speed_10m)} km/h`;
    elements.windDirection.textContent = cardinalDirection(current.wind_direction_10m);
    elements.metricFeelsLike.textContent = `${safeNumber(current.apparent_temperature)}°C`;
    elements.precipitation.textContent = `${safeNumber(current.precipitation, 1)} mm`;
    renderHourly(data.hourly);

    elements.weatherContent.hidden = false;
    setStatus(`Showing live weather for ${place.name}. Data provided by Open-Meteo.`);
  } catch (error) {
    setStatus(`${error.message || "Unable to fetch weather data."} Check your connection and try again.`, "error");
  } finally {
    setLoading(false);
  }
}

elements.searchButton.addEventListener("click", searchCities);
elements.cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchCities();
  }
  if (event.key === "Escape") elements.searchResults.hidden = true;
});
elements.cityInput.addEventListener("input", () => {
  elements.searchResults.hidden = true;
});
elements.refreshButton.addEventListener("click", () => {
  if (activeLocation) loadWeather(activeLocation);
  else searchCities();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap")) elements.searchResults.hidden = true;
});

// Load a helpful example location so the dashboard has content on first launch.
const defaultLocation = {
  name: "Indore",
  latitude: 22.7196,
  longitude: 75.8577,
  country: "India",
  admin1: "Madhya Pradesh"
};
elements.cityInput.value = defaultLocation.name;
loadWeather(defaultLocation);
