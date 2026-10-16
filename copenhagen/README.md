# Copenhagen Rent Evaluator

Compares rental homes in Copenhagen that already meet your must-haves. Open `index.html` in a modern
browser, together with the `data/` folder: nothing to install, and your data stays in the browser.

## How to use it

1. **You:** monthly take-home pay, other costs, length of stay.
2. **Shortlist:** for each home, street and number (the neighbourhood and the position on the map are worked
   out for you), rent, utilities, deposit, lease, furnishing, commute, transport, included services and your
   own rating of the flat. An unknown street can be placed by clicking on the map.
3. **Neighbourhoods:** your rating of amenities and social life.

Every star rating runs from 0.5 to 5 in half-star steps: click the half of a star, click the same spot again
to clear it, or use the arrow keys.

## What it shows

- **Best:** the home with the highest score, with its stars and its all-in monthly cost.
- **Map:** neighbourhoods, parks, stations and the homes numbered by rank.
- **Stars:** overall, costs, area, commute and flat. "Detail" opens safety, metro, green space, quiet,
  amenities and social life; hovering over a star shows the data behind it.
- **Costs:** all-in kr a month, rent as a share of take-home pay with an indicator (✓ up to 30%, ! up to 40%,
  ✕ above), what is left each month, cash needed to move in, and the lease.
- **Watch out:** short labels only when needed: high noise, an evening that feels unsafe, a deposit over three
  months, a lease longer than your stay, missing ratings.

## Data built in, per address

- **Safety:** the City of Copenhagen's [Tryghedsundersøgelse 2025](https://www.kk.dk/sites/default/files/2025-06/Tryghedsunders%C3%B8gelsen%202025.pdf),
  across its 13 neighbourhoods: the average of residents who feel safe in the neighbourhood and in the evening.
  70% = 1 star, 90% = 5. Crimes per 1,000 residents stay in the detail as context.
- **Metro and train:** distance to the nearest station. 5 stars within 300 m, one fewer every 300 m.
- **Green space:** distance to the nearest park of at least 1 hectare. 5 stars within 200 m, one fewer every 250 m.
- **Quiet:** road noise Lden at the address (2022 mapping). 5 stars at 50 dB, one fewer every 5 dB.

Sources: Københavns Kommune (open data) and © OpenStreetMap contributors for addresses and the boundaries of
Frederiksberg, where noise and the safety survey are not available. To refresh the data:
`pip install shapely pyproj && python3 tools/build_data.py`.

Amounts are in Danish kroner (kr). The example data is illustrative. Shortlists saved by the earlier Italian
version still load.
