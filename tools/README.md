# tools — how src/data/ikea.js was made

`ikea-scrape.js` takes a list of queries, hits IKEA US's own search API for the product URL and
price, then reads the Measurements tab off the product page. `build-catalog.js` maps those raw
records onto the catalogue file, choosing the right pair of measurements for each category (a bed's
footprint is width x length, a table's is length x width, a rug is listed in feet) and renaming the
ids where IKEA has replaced a discontinued product with a differently-named one.

```bash
node ikea-scrape.js queries.json > catalog-raw.json     # then q2.json, q3.json
node build-catalog.js ../src/data/ikea.js
```

`catalog-*.json` are the captured responses, kept so the catalogue can be rebuilt without
re-scraping.
