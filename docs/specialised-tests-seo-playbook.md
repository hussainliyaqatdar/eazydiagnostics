# Specialised tests: search ranking playbook

For the 70 specialised tests (NIPT, Double Marker, Lp(a), ApoB, NT-proBNP, Procalcitonin, Thrombocheck and the rest). Covers what the search results look like today, what we changed on the pages, and what to do in Google Search Console and the Google Business Profile.

Nothing here can guarantee position 1. It removes what is holding the pages back and sets up the measurement to see what works.

## 1. What the search results look like (checked November 2026)

For "NIPT test home collection Bangalore" and "Lipoprotein(a) test Bangalore", the results are almost entirely lab aggregators with a page for every test and every locality: Orange Health, Redcliffe Labs, Bajaj Finserv Health, Metropolis, Tata 1mg, Apollo 247 and Max Lab. Three things follow.

1. **Our biggest ranking limit is the domain, not the content.** The site runs on `homecarelabs.onrender.com`, a subdomain of a shared hosting domain. It cannot build its own domain authority, cannot be verified as a Search Console domain property (no DNS access), and cannot be changed to a brand domain without losing what it has earned. Moving to a domain you own (for example eazydiagnostics.in), with 301 redirects from the old address, is the single most valuable SEO step. Page-level work helps, but it will be competing against domains that have years of authority.
2. **Searches for "Agilus" or "SRL" plus a test are mostly brand searches.** SRL Diagnostics was renamed Agilus Diagnostics in May 2023, so people still search both names. The lab's own site owns those results. Our realistic target is a different slice: "authorised partner", "home collection" and "Bangalore" modifiers, plus people who want the Agilus/SRL lab but not the trip.
3. **Our home-collection angle is a real differentiator on some tests.** One competitor's NIPT page says home collection is not available for NIPT in Bangalore. That is a gap to lead with.

**Price check before spending on traffic.** From the same searches, listed prices elsewhere were roughly Rs. 12,999 to 17,000 for NIPT (we list 16,500) and Rs. 649 to 1,329 for Lipoprotein(a) (we list 1,400). Price does not affect ranking, but it affects whether a visitor books. Review the prices on the tests that are most searched.

## 2. Keyword framework

`docs/specialised-tests-keywords.csv` has about 2,000 phrases across the 71 curated test pages (70 listed on the hub, as the two AMH entries share one listing). Regenerate it with `node scripts/keyword-map.js`.

| Priority | Intent | Pattern (per test) | Used for |
|---|---|---|---|
| P1 | Local, ready to book | `<test> test home collection Bangalore`, `... at home Bangalore`, `... in Bangalore` | Title, H1 line, first screen |
| P1 | Price | `<test> test price Bangalore` | Meta description, facts table |
| P1 | Brand | `<test> test Agilus Diagnostics`, `... SRL Diagnostics` | Title, "tested at" line, FAQ |
| P2 | Variants | `book <test> test online Bangalore`, `<test> test near me`, `<test> test cost` | FAQs, body copy |
| P2 | Brand + price | `Agilus <test> test price`, `SRL <test> test Bangalore` | FAQ |
| P2 | Local area | `<test> test JP Nagar` (also Jayanagar, BTM Layout, Banashankari, Kanakpura Road) | Facts table (areas served) |
| P2 | Other names | `Apo B test home collection Bangalore`, `PCT test price Bangalore` | "Also known as", search aliases |
| P3 | Questions (AI answers) | `what is <test>`, `when to do <test>`, `<test> preparation fasting`, `which doctor prescribes <test>` | FAQ block, "When is it done?" |

The CSV has no search volumes. Use it as a tracking list, and let Search Console show the real impressions and positions per page.

## 3. What changed on the pages

Each test page now has:

- **Title:** `<Test> in Bangalore | Home Collection | Agilus (SRL)`. The phrases people type, in order of importance. The price moved to the description.
- **Description:** the price, "tested at Agilus (SRL) Diagnostics NABL labs", the report time and "pay after collection".
- **A line under the H1:** "Home collection in Bangalore · Tested at Agilus (SRL) Diagnostics labs".
- **A facts block** ("`<Test>` at home in Bangalore: price, lab and report time"): price, report time, lab, who orders it, home-collection areas. This is the kind of block AI assistants quote.
- **A short SRL / Agilus explanation:** Agilus Diagnostics was earlier known as SRL Diagnostics, so people searching either name find the same lab.
- **Four more FAQs per test** (ten in total, all in the FAQ markup): "Is it available at Agilus (SRL)?", "Which doctor orders it?", "What is it also called?", "How do I book it at home in Bangalore?"
- **Internal links:** the home page now has a "Specialised tests, collected at home in Bangalore" section with 12 test links and 9 specialty links, so the home page's authority flows to the product pages. Each test links to its specialty page and to 3 siblings, and `/llm-info` lists every specialised test with price and report time.

## 4. Google Search Console

1. **Move to your own domain first** (see section 1). Then add it as a Domain property (DNS verification), keep the old property for monitoring the redirect, and submit the sitemap again.
2. **Submit the sitemap** (`/sitemap.xml`). It now lists the hub pages and all test pages.
3. **Request indexing in priority order.** Quota is about 10 to 12 URL requests a day, so start with `/specialised-tests`, then the 9 specialty pages, then the most searched tests (NIPT, Double Marker, Quadruple Marker, Lp(a), ApoB, ApoA1, NT-proBNP, Procalcitonin, Thrombocheck, AMH).
4. **Weekly, in Performance:**
   - Filter Pages containing `/tests/`, then add queries containing `agilus|srl|home collection`.
   - Look at queries at positions 8 to 20. They are closest to page one. Improve the matching test page (title, FAQ, facts block) for those first.
   - Look at pages with high impressions and low click-through. Rewrite the title and description.
5. **Pages report:** check for "Discovered, currently not indexed" on test pages. If many appear, add more internal links to them and link them from the specialty pages.
6. **Rich results:** inspect a test page and confirm Product, FAQ and Breadcrumb are detected without errors.
7. **Core Web Vitals:** on the free hosting tier the server sleeps, which slows the first visit and can hurt crawling. Fix the uptime job (the cron job is still failing) or move to an always-on plan.
8. **Bing Webmaster Tools:** add the site and submit the sitemap. ChatGPT search draws on Bing's index, so this matters for AI answers.

## 5. Google Business Profile

1. **Categories:** primary "Medical laboratory" (or "Diagnostic center"); add "Blood testing service" as secondary, if available for your listing.
2. **Services / products:** add each specialised test as a service or product with its price and a link to its page. Start with the top 20. Use the page title as the service name, for example "NIPT test, home collection Bangalore".
3. **Service area:** list JP Nagar, Jayanagar, BTM Layout, Banashankari and Kanakpura Road, and the rest of Bangalore you cover.
4. **Description:** say "authorised partner of Agilus (SRL) Diagnostics", "home sample collection in Bangalore", and name a handful of the specialised tests.
5. **Website and booking links:** point to `/specialised-tests`; add UTM tags so Search Console and Google Analytics can show which traffic comes from the profile.
6. **Posts:** one a week about a specific test (what it is, price, how to book), each linking to its page.
7. **Questions & answers:** post and answer the common questions yourself, using the FAQ wording from the pages.
8. **Reviews:** ask happy customers to mention the test and the area ("NIPT home collection in JP Nagar"). Never offer rewards. Reply to every review.
9. **Listings elsewhere:** keep the name, address and phone number identical on Practo, JustDial, Sulekha and similar directories, with a link back to the site.

## 6. Authority off the site

- Ask doctors in your referral network to link to the test pages from their clinic sites.
- A short, medically reviewed guide per specialty ("Which blood tests does a cardiologist order?") with links to the test pages.
- Get the clinical wording on the test pages reviewed by a doctor or your lab partner, and add "Medically reviewed by" with a name and date. This matters for health content.
- Check Agilus's brand guidelines for how an authorised partner may use the Agilus and SRL names.

## 7. What to measure

| Metric | Where | Target |
|---|---|---|
| Indexed test pages | Search Console, Pages | 70 of 70 within 6 weeks |
| Impressions for `/tests/` pages | Search Console, Performance | rising week on week |
| Average position, P1 queries | Search Console | into the top 10 within 90 days |
| Click-through on test pages | Search Console | above 3% where position is under 10 |
| Bookings from specialised tests | your orders | tracked monthly |
| Calls and direction requests | Business Profile Insights | tracked monthly |

## 8. Honest limits

- Position 1 for brand queries ("Agilus NIPT") will stay with the lab's own site.
- The domain change is slow to pay off; expect weeks to months after the move.
- The clinical copy has not been reviewed by a medical professional.
