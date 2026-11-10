# WhatsApp order updates

The site WhatsApps patients and prescribing doctors when something changes on an order in the admin portal. It uses
Meta's WhatsApp Cloud API (the official WhatsApp Business API).

## What triggers a message

| Change (on `/admin/orders`) | Patient | Prescribing doctor |
|---|---|---|
| Visit status -> Visit scheduled / Samples collected / Reached lab / Partially complete / Completed / Cancelled | yes | yes |
| Visit status -> Booked (the starting state) | - | - |
| Payment -> Paid / Refunded | yes | - |
| Payment -> Pending (a correction) | - | - |
| A member's report -> Partial report / Full report | that member | that member's doctor |

- **Doctors are messaged only if the patient chose them as "Prescribed by" for a member from the registered-doctors list
  at booking.** Each member has their own prescribing doctor. A doctor who was only typed in, or no doctor, gets nothing.
  A doctor with several members on one visit gets one message listing them. The number used is the doctor's WhatsApp
  number (the one given at `/for-doctors`, editable on the clinic page). A doctor who joined an existing clinic and has
  not been approved yet is not messaged.
- **Patients:** the visit's contact number, plus any member who gave their own number for their report. A number
  shared by several members hears once.
- **No double sends.** Setting the status a visit (or payment, or report) already has changes nothing and sends nothing.
  Two clicks at the same moment change it once. Every message is also reserved in the `order_notifications` table under a
  unique (order, number, event) key before it is sent, so the same news can never be recorded or sent twice to the same
  number. A message that fails is **not** retried automatically; see "Using it".
- Report messages carry a link (`/api/reports/<random token>`) to the member's report - the clinic-branded copy when
  there is one. The link is a long random token, so only someone who was sent it can open it.

Change who hears about what in `NOTIFY_VISIT` in `lib/order-status.ts`, and the wording in `patientLine` / `doctorLine` /
`paymentLine` / `reportLine` in the same file.

## One-time setup (done in Meta's dashboards, not in code)

1. Create a **Meta Business account** and a **WhatsApp Business Account** at business.facebook.com / developers.facebook.com
   (create an app, add the *WhatsApp* product).
2. Add and verify your business phone number. It must not be already registered on the normal WhatsApp app.
   (The number on the site, +91 70197 64500, can only be used if you move it off the consumer app first.)
3. Create a **permanent access token**: Business settings -> Users -> *System users* -> add a system user, give it the
   WhatsApp account, and generate a token with `whatsapp_business_messaging` and `whatsapp_business_management`.
   The temporary token in the dashboard expires in 24 hours - do not use it in production.
4. Note the **Phone number ID** (WhatsApp -> API Setup).
5. Create and get approved the two **message templates** below (WhatsApp -> Message templates). Category: **Utility**. Language: **English**.
   Approval usually takes minutes to a day.
6. On the server (e.g. Render -> Environment) set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `SITE_URL`
   (the public address, used to build report links).

WhatsApp only lets a business start a conversation with an approved template, which is why the wording lives in the variables
below instead of free text. All events (status, payment, report) use the same two templates; the last variable carries the sentence.

### Template `order_status_patient`

```
Hello {{1}}, an update on your Eazy Diagnostics home collection (booking {{2}}): {{3}}
```

Sample values for approval: `Priya` / `BK-M3X9K2` / `Your sample has been collected and is on its way to the lab.`

### Template `order_status_doctor`

```
Hello {{1}}, an update from Eazy Diagnostics on your patient {{2}} (booking {{3}}): {{4}}
```

Sample values: `Dr. Rao` / `Priya` / `BK-M3X9K2` / `The sample has been collected and is on its way to the lab.`

If you name the templates differently, set `WHATSAPP_PATIENT_TEMPLATE` / `WHATSAPP_DOCTOR_TEMPLATE`. Keep the number and order of
variables the same, or change `lib/order-notifications.ts` to match.

## Using it

- **`/admin/orders`**: change a visit's status or payment; each change shows who was reached or why not. Open an order
  (`/admin/orders/<id>`) to see each member, upload their report PDF, set its status (No report yet -> Partial report -> Full
  report), and read the order's WhatsApp log.
- **Reports:** a member has one report at a time; a full report replaces a partial one. Upload the lab's PDF with
  **Upload report** - saving a file never sends a message; only **Change status -> Update & notify** does. The saved file is
  shown in a preview pane so you can check the header before you notify. If the member's prescribing doctor is registered, the PDF is re-saved with that doctor's clinic header (clinic
  name, logo and address on the left; the doctor's name and qualifications on the right) added above every page - the lab's own
  content is not touched. With no registered doctor the report is kept exactly as the lab produced it. After changing a clinic's
  logo or a doctor's details, press **rebuild header**.
- A failed message (template not approved yet / name mismatch, expired token, a number not on WhatsApp) is shown in red with the
  reason. It is not re-sent automatically: fix the cause, then set another status and back, or message the patient by hand.
- With no token configured, changes are still saved and the log says nothing was sent.

## Consent

Patients give their WhatsApp number at checkout "for report delivery", and doctors tick consent when they register. Make sure your
checkout and doctor sign-up text says that order updates will be sent on WhatsApp; Meta requires opt-in for business messages.
