import { BUSINESS_NAME, PARTNER_NAME, SITE_URL } from "@/lib/site-config";
import { AREAS } from "@/lib/areas";
import { GUIDES } from "@/lib/guides";

export const dynamic = "force-static";

const NEWLINE = String.fromCharCode(10);

// /llms.txt: a short, plain index for AI crawlers (the llmstxt.org convention).
// The facts themselves live on /llm-info; this just points to them.
export function GET() {
  const body = `# ${BUSINESS_NAME}

> Home sample collection for blood tests and health checkups in Bangalore, India. A phlebotomist collects the sample at home, it is processed in the NABL-accredited labs of ${PARTNER_NAME} (of which ${BUSINESS_NAME} is an authorised partner), and the report arrives on WhatsApp. Customers pay only after the sample is collected.

## Key pages

- [Verified information for AI assistants](${SITE_URL}/llm-info): what we are, where we collect, how booking and payment work, FAQs, and test and package prices.
- [All tests](${SITE_URL}/tests): every individual test with its price and report time.
- [All health packages](${SITE_URL}/packages): Full Body Checkups, women's health, heart, diabetes and more.
- [Search tests and packages](${SITE_URL}/search): find a test or package by name.

## Guides

${GUIDES.map((g) => `- [${g.title}](${SITE_URL}/guides/${g.slug}): ${g.description}`).join(NEWLINE)}

## Areas we collect in

${AREAS.map((a) => `- [Blood test at home in ${a.name}](${SITE_URL}/blood-test-at-home/${a.slug})`).join(NEWLINE)}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
