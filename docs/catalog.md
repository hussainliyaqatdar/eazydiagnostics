# The catalog: tests, packages and doctor panels

Every test and package is stored in the database (tables `catalog_tests`, `catalog_packages`) and managed from **`/admin/catalog`**.

## How the site reads it (and why search and booking stay fast)

- The catalog is loaded from the database **once per server process** and kept in memory (`lib/catalog-store.ts`). A search or a booking
  reads that copy: it never runs a catalog query. Every admin edit bumps a version number and clears the copy on that server immediately;
  other servers ask the database whether the version changed at most every 5 seconds (one tiny query), so a change is live everywhere
  within seconds.
- **Search runs in the browser.** The browser downloads a compact copy of the catalog once (`GET /api/catalog?v=<version>`: names,
  aliases, prices, codes and what each package includes; no long descriptions). It is cached forever for that version and kept in
  localStorage, so repeat visits have it instantly and typing never waits on the network. The version in the address changes whenever the
  catalog changes, so an edit is picked up on the next page load.
- **Booking** prices every line from the server's in-memory catalog; the browser's prices are never trusted. An item that was switched
  off since it was added to the cart is refused with "no longer available".
- Pages (home, `/tests`, `/packages`, product pages, `/llm-info`, the sitemap) are built when requested, from memory.
- On the first run the tables are filled from `data/tests.json` and `data/packages.json` (built from the spreadsheet by
  `npm run build:catalog`). After that the database is the catalog and those files are no longer read.

## Ids and partner labs

Every test has an **internal_test_id** (`T-000001`, ...) and every package an **internal_package_id** (`P-000001`, ...). They are ours:
generated when the item is created, permanent, never reused (even after a delete) and never shown to a lab. Carts, packages and orders
refer to them.

A partner lab has its own ids for the same things (its **external_test_id** / **external_package_id**). They live in `catalog_lab_ids`: one
row per item per lab, unique within a lab (two tests cannot share a lab id), with an optional `cost` (what that lab charges us). The same
external id may be used by different labs.

- **Mandatory:** adding a test or a standard package requires the **current lab's** id for it. Without one it is refused: nothing can be on
  sale that cannot be ordered from the lab. (A doctor's custom panel may have none: it is sent to the lab as the tests it includes.)
- **The current lab** (`labs.is_current`, exactly one) is the lab orders are for. SRL Diagnostics is the first lab; the ids in the catalog files
  became SRL's ids when the catalog was first loaded.
- **Switching labs** (admin → Tests & packages → Partner labs): add the new lab, give every test and package its id there (type them in, or
  *Download CSV*, fill in the lab's ids and *Import CSV*; lines are `internal id, lab id[, cost]`), then *Make current*. The switch is
  refused while any active test or standard package has no id at the new lab (it says how many and which), unless you choose *Switch
  anyway*. After a switch new orders are for the new lab, the site's items carry its ids, and new tests need its ids. Nothing is renamed.
- **Orders keep their history.** Each order records the lab it was placed for (`orders.lab_id`), and every line records our internal id and
  that lab's id as they were then. Changing labs never changes an order.
- **Lab order sheet.** `GET /api/admin/orders/<id>/lab-order` gives an order as a lab needs it, in the lab's ids (custom panels expanded
  into tests; anything the lab has no id for is listed under `missing`). `?lab=<lab id>` builds it for a different lab, for example to move
  an order over to a new partner.
- **Integrating a lab with an API or webhooks** needs no catalog change: write an adapter implementing `LabAdapter` (`lib/labs/types.ts`:
  `submitOrder`, `handleWebhook`) and register it with `registerLabAdapter` (`lib/labs/index.ts`). Labs without an adapter are handled by
  hand from the order sheet, as SRL is today.

## Tests

- A test's **internal id** and web address (slug) never change. Its **lab id** (at the current lab) can be corrected on the test, but never
  left empty; other labs' ids are on the Partner labs tab.
- **Deactivate** hides a test from the site and search and stops it being booked; it stays in the list and can be activated again.
  **Delete** removes it for good (and its lab ids), and is refused while a package still includes it. Orders already placed keep showing it.
- Both ids are shown next to every item on `/admin/orders/<id>`: the lab's id (as it was when the order was placed) and our internal id.
  For orders placed before ids were saved on each line they are looked up from the catalog.

## Packages and custom panels

- Standard packages are managed on the **Packages** tab (the current lab's package id is required).
- A **custom panel** belongs to one doctor and is shown **only on that doctor's own affiliate link** (in search, the packages list and its
  page, and it can only be booked from that link). It is never shown on the main site, on another doctor's link or in the sitemap, and
  its page is not indexed.
- Make one on the **Doctor panels** tab: choose the doctor, then *New panel*, optionally starting from a standard package (its tests,
  wording and report time are copied; the tests can then be changed). Give it the doctor's own name for it, the **patient price** and the
  **B2B price** (what the clinic is charged; kept on each order line for the clinic's invoice).
- **Deactivate** a panel to hide it on that doctor's link without deleting it.
