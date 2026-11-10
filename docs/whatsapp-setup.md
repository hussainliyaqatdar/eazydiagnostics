# WhatsApp order updates

The site WhatsApps patients and prescribing doctors when something changes on an order in the admin portal. It uses
Meta's WhatsApp Cloud API (the official WhatsApp Business API). Templates are written, submitted to Meta and managed
from **`/admin/whatsapp`**; delivery status comes back from Meta's webhook.

## How it fits together

```
admin changes a status ──> notification flow ──> picks the template for the event ──> Meta Cloud API ──> phone
 (/admin/orders)          (lib/order-notifications)   (/admin/whatsapp)                                    │
                                   │                                                                       │
                          order_notifications <── delivered / read / failed ── /api/whatsapp/webhook <─────┘
```

- **Events.** `visit.<status>`, `payment.paid|refunded`, `report.partial|full` (see `lib/whatsapp-events.ts`).
- **Templates.** Each template belongs to an audience (patients or doctors) and is bound to one or more events. When an
  event fires, the flow uses the template bound to it **if it is Approved and switched on**. Otherwise it falls back to the
  generic update template (`order_status_patient` / `order_status_doctor`, below), so a message is never lost just because a
  custom template is still in review.
- **Variables.** A template's `{{1}}`, `{{2}}`... are each mapped to a value: the recipient's first name, the patient name(s),
  the booking id, the status name or ready-made sentence, collection date and slot, the amount, the report type and link, our
  contact number, or the business name.
- **Delivery status.** Every message records WhatsApp's message id. The webhook reports Sent / Delivered / Read / Failed against
  it (never moving a message backwards), and the message log on `/admin/whatsapp` shows it, with the reason when it fails.

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
- **Patients:** each member's own number, or the visit's number when they gave none. A number shared by several members hears once.
- **No double sends.** Setting the status a visit (or payment, or report) already has changes nothing and sends nothing.
  Two clicks at the same moment change it once. Every message is also reserved in the `order_notifications` table under a
  unique (order, number, event) key before it is sent, so the same news can never be recorded or sent twice to the same
  number. A message that fails is **not** retried automatically.
- Uploading a report file never sends anything; only changing a status does.
- Report messages carry a link (`/api/reports/<random token>`) to the member's report - the clinic-branded copy when
  there is one. The link is a long random token, so only someone who was sent it can open it.

Change who hears about what in `NOTIFY_VISIT` in `lib/order-status.ts`, and the built-in sentences in `patientLine` / `doctorLine` /
`paymentLine` / `reportLine` in the same file.

## One-time setup (done in Meta's dashboards, not in code)

1. Create a **Meta Business account** and a **WhatsApp Business Account** at business.facebook.com / developers.facebook.com
   (create an app, add the *WhatsApp* product).
2. Add and verify your business phone number. It must not be already registered on the normal WhatsApp app.
   (The number on the site, +91 70197 64500, can only be used if you move it off the consumer app first.)
3. Create a **permanent access token**: Business settings -> Users -> *System users* -> add a system user, give it the
   WhatsApp account, and generate a token with `whatsapp_business_messaging` and `whatsapp_business_management`.
   The temporary token in the dashboard expires in 24 hours - do not use it in production.
4. Note the **Phone number ID** (WhatsApp -> API Setup) and the **WhatsApp Business Account ID** (shown beside it).
5. On the server (e.g. Render -> Environment) set:

   | Variable | What it is |
   |---|---|
   | `WHATSAPP_ACCESS_TOKEN` | the permanent token |
   | `WHATSAPP_PHONE_NUMBER_ID` | the number messages go out from |
   | `WHATSAPP_BUSINESS_ACCOUNT_ID` | needed to create, sync and delete templates |
   | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | a secret string you choose (step 6) |
   | `WHATSAPP_APP_SECRET` | the app's secret (App settings -> Basic); webhook calls are rejected in production without it |
   | `SITE_URL` | the public address, used to build report links |

6. **Webhook.** In the app's WhatsApp -> Configuration, set the callback URL to `<SITE_URL>/api/whatsapp/webhook` and the
   verify token to `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, then subscribe to `messages` and `message_template_status_update`.
   Without the webhook everything still works; the log just stays at "Sent" and templates need **Sync with Meta**.
7. Open `/admin/whatsapp` -> **Connection** and press **Test connection**.

### The two generic update templates

WhatsApp only lets a business start a conversation with an approved template. These two are the fallback for every event, with
the last variable carrying the sentence. Create each in `/admin/whatsapp` -> Templates (or in Meta's dashboard, then **Sync with
Meta**), category **Utility**, language **English**, and submit it. No events need to be ticked: they are picked by name.

> **Meta does not allow a variable at the very start or end of a template**, so the closing words below are required. (An earlier
> version of this document ended each template with the variable, which Meta rejects.)

`order_status_patient`

```
Hello {{1}}, an update on your Eazy Diagnostics home collection (booking {{2}}): {{3}} Thank you for choosing Eazy Diagnostics.
```

Variables: 1 = recipient's first name, 2 = booking id, 3 = ready-made sentence about the change.

`order_status_doctor`

```
Hello {{1}}, an update from Eazy Diagnostics on your patient {{2}} (booking {{3}}): {{4}} Thank you for partnering with Eazy Diagnostics.
```

Variables: 1 = recipient's first name (the doctor), 2 = patient name(s), 3 = booking id, 4 = ready-made sentence.

If you name them differently, set `WHATSAPP_PATIENT_TEMPLATE` / `WHATSAPP_DOCTOR_TEMPLATE` (and `WHATSAPP_TEMPLATE_LANGUAGE`).
Keep the number and order of variables the same, or change `lib/order-notifications.ts` to match.

## Using `/admin/whatsapp`

- **Templates:** `+ New template` opens a form with the wording (insert variables from a menu), what fills each variable, the
  audience, the events it is used for, and a live preview. *Save and submit to Meta* sends it for review (usually minutes to a day);
  its status then follows Meta's (In review -> Approved / Rejected, with the reason). From the table you can edit, switch a template
  on or off, send a test of an approved one to your own phone, resubmit a rejected one, or delete it (also from Meta).
  Rewording an approved template sends it back for review; until it is approved again the generic template is used.
  One event can have only one switched-on template per audience.
- **What is sent:** which template each event uses for patients and doctors, and the state of the two generic templates.
- **Message log:** every message about an order, with template, recipient and Sent / Delivered / Read / Failed, filterable and paged.
- **Connection:** which settings are present, a connection test, and what to enter in Meta's webhook setup.
- **Sync with Meta** pulls every template's status, brings in templates that exist only at Meta (switched off and unmapped, so they
  are not used until you set their events and variables), and flags ones Meta no longer has.

## Using `/admin/orders`

- Change a visit's status or payment; each change shows who was reached or why not. Open an order (`/admin/orders/<id>`) to see
  each member, upload their report PDF, set its status (No report yet -> Partial report -> Full report), and read the order's audit log.
- **Reports:** a member has one report at a time; a full report replaces a partial one. Upload the lab's PDF with
  **Upload report** - saving a file never sends a message; only **Change status -> Update & notify** does. The saved file is
  shown in a preview pane on click so you can check the header before you notify. If the member's prescribing doctor is registered,
  the PDF is re-saved with that doctor's clinic header (clinic name, logo and address on the left; the doctor's name and
  qualifications on the right) - the lab's own content is not touched. With no registered doctor the report is kept exactly as the lab
  produced it. After changing a clinic's logo or a doctor's details, press **Rebuild header**.
- A failed message (template not approved yet / name mismatch, expired token, a number not on WhatsApp) is shown in red with the
  reason. It is not re-sent automatically: fix the cause, then set another status and back, or message the patient by hand.
- With no token configured, changes are still saved and the log says nothing was sent.

## Consent

Patients give their WhatsApp number at checkout "for report delivery", and doctors tick consent when they register. Make sure your
checkout and doctor sign-up text says that order updates will be sent on WhatsApp; Meta requires opt-in for business messages.
