# Atmos Weather Dashboard

A responsive weather dashboard with a premium dark interface. Search for cities around the world and view current conditions and an hourly forecast.

## Features

- Search for cities worldwide by city name.
- Display matching locations with region/country information.
- Show current weather conditions for the selected city.
- View an hourly forecast.
- Responsive layout for desktop and mobile screens.
- Premium dark visual design.

## Technologies

- HTML5 for the page structure
- CSS3 for styling and responsive layout
- Vanilla JavaScript for search, API requests, and rendering weather data

## APIs Used

This project uses the free [Open-Meteo](https://open-meteo.com/) services:

- **Geocoding API** — finds city names and returns latitude/longitude and location details.
- **Weather Forecast API** — retrieves current weather and hourly forecast data for the selected coordinates.

No API key is required for normal non-commercial use. An internet connection is needed for city lookup and weather data.

## Setup and Run in VS Code

1. Download or clone this repository.
2. Open the project folder in Visual Studio Code.
3. Make sure `index.html`, `style.css`, and `script.js` are in the expected project location and are all included in the repository.
4. Install the **Live Server** extension in VS Code (by Ritwick Dey).
5. Open `index.html`, right-click in the editor, and select **Open with Live Server**.
6. Search for a city and select a result to load its weather.

You can also open `index.html` directly in a browser, but Live Server is recommended for development.

## Project Structure

```text
Atmos-Weather-Dashboard/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Troubleshooting

- **City search returns no results:** Check your internet connection and confirm the Open-Meteo Geocoding API is reachable.
- **Weather does not load:** Check the browser developer console for network errors, and verify that the selected location's coordinates are passed to the forecast request.
- **Styling is missing:** Confirm that the stylesheet is named `style.css` and linked correctly in `index.html`.
- **JavaScript is not running:** Confirm that `script.js` is linked correctly and check the browser console for errors.

## Future Improvements

- Add a multi-day forecast.
- Add saved/favourite cities.
- Add unit switching between Celsius and Fahrenheit.
- Improve accessibility and loading/error states.

## License

Add a license file if you intend to publish this project under a specific open-source license.
