# Google Maps: "Search location" at checkout

On the checkout page, **Collection address → Google Maps Location** has two buttons: **Search location** and **Add manually**.

**Search location** opens a dialog (a drawer that slides up from the bottom on phones). The patient can:

- type their area, street or landmark and pick a suggestion (Google Places, limited to India);
- tap **Use current location** inside the dialog;
- move the map so the fixed pin sits on their doorstep.

Nothing is saved until they tap **Confirm location**. At that moment the dialog asks Google once for the address of the pin (not each time the map moves,
which would be billed each time); it is shown under "Location captured" on the checkout page. The saved location is the same latitude and longitude the page always used, so
bookings, emails and the admin pages are unchanged. **Add manually** (paste a Google Maps link or `lat, lng`) is still there.

## One-time setup

1. In Google Cloud, create a project (or use one) with billing enabled, and enable these APIs:
   **Maps JavaScript API**, **Places API (New)** and **Geocoding API**.
2. Create an **API key** and restrict it:
   - Application restriction: **Websites (HTTP referrers)**, e.g. `https://homecarelabs.onrender.com/*` (and `http://localhost:3000/*` for development).
   - API restriction: the three APIs above.
3. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` on the server (Render → Environment) and redeploy. It is a browser key, so it is meant to be public;
   the referrer restriction is what protects it. It is read when the site is built, so it needs a new deploy to take effect.
4. Set a daily quota cap on each API in Google Cloud so a spike can never run up a bill.

Without the key the dialog still opens, but offers only **Use current location** (which is applied straight away), and says that map
search isn't available. Checkout keeps working.

## Cost note

Google bills per use. The dialog loads the map only when it is opened, and a search session (typing, then choosing a result) is billed once.
Typing needs at least three characters before it asks Google for suggestions.
