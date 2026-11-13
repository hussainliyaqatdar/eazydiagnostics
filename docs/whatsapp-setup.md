# WhatsApp order updates

The site WhatsApps patients and prescribing doctors when something changes on an order in the admin portal. It uses
Meta's WhatsApp Cloud API (the official WhatsApp Business API). Templates are written, submitted to Meta and managed
from **`/admin/whatsapp`**; delivery status comes back from Meta's webhook. Admin results (status changed, message sent or not,
saved, errors) appear as toast notifications that stay for 10 seconds.

## How it fits together

```
admin changes a status ──> notification flow ──> picks the template for the event ──> Meta Cloud API ──> phone
 (/admin/orders)          (lib/order-notifications)   (/admin/whatsapp)                                    │
                                   │                                                                       │
                          order_notifications <── delivered / read / failed ── /api/whatsapp/webhook <─────┘
```

- **Events.** `visit.<status>`, `payment.paid|refunded`, `report.partial|full` (see `lib/whatsapp-events.ts`).
- **Templates and mapping.** A template is written on the Templates tab (wording, variables, audience) and sent to Meta. Which
  status uses it is chosen separately on the **Template - Status Mapping** tab: for each event, one template for patients and one
  for doctors. The same event can therefore have a patient template and a doctor template.
- **No mapping, no message.** There is no fallback template. If an event has no template mapped for an audience, or its template is not
  approved by Meta yet (or has a variable with nothing mapped), nothing is sent to that audience. The admin is told straight away: a
  toast on `/admin/orders` says which audience was not messaged and why, and the order's audit log records it.
- **Variables.** A template's `{{1}}`, `{{2}}`... are each mapped to a value: the recipient's first name, the patient name(s),
  the booking id, the status name or ready-made sentence, collection date and slot, the amount, the report type and link, our
  contact number, or the business name.
- **Delivery status.** Every message records WhatsApp's message id. The webhook reports Sent / Delivered / Read / Failed against
  it (never moving a message backwards), and the message log on `/admin/whatsapp` shows it, with the reason when it fails.

## What triggers a message

| Change (on `/admin/orders`) | Patient | Prescribing doctor |
|---|---|---|
| Visit status -> Visit scheduled / Samples collected / Reached lab / Partially complete / Completed / Cancelled | yes | yes |
| **Order placed** (the **Visit booked** event, sent once when the customer books) | yes | yes |
| Visit status set back to Booked in the admin (a correction) | - | - |
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
   | `WHATSAPP_APP_ID` | the Meta app's id (App settings -> Basic); needed to attach an image to a template |
   | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | a secret string you choose (step 6) |
   | `WHATSAPP_APP_SECRET` | the app's secret (App settings -> Basic); webhook calls are rejected in production without it |
   | `SITE_URL` | the public address, used to build report links |

6. **Webhook.** In the app's WhatsApp -> Configuration, set the callback URL to `<SITE_URL>/api/whatsapp/webhook` and the
   verify token to `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, then subscribe to `messages` and `message_template_status_update`.
   Without the webhook everything still works; the log just stays at "Sent" and templates need **Sync with Meta**.
7. Open `/admin/whatsapp` -> **Connection** and press **Test connection**.

### Writing templates

WhatsApp only lets a business start a conversation with an approved template. Create each in `/admin/whatsapp` -> Templates (or in
Meta's dashboard, then **Sync with Meta**), category **Utility**, and submit it. A new template can start from an existing one (the
"Start from an existing template" picker copies its wording and variables).

> **Meta does not allow a variable at the very start or end of a template**, so end the text with a few fixed words, for example:
> `Hello {{1}}, an update on your Eazy Diagnostics home collection (booking {{2}}): {{3}} Thank you for choosing Eazy Diagnostics.`

Each `{{n}}` is mapped to a value in the form: the recipient's first name, patient name(s), booking id, status name or ready-made
sentence, collection date and slot, the amount, the report type and link, our contact number, or the business name.

## Payment requests (with the payment QR code)

For orders where **Eazy Diagnostics** collects payment, the patient can be sent a "please pay" message with the payment QR code as an image.

1. **Upload the QR image** on `/admin/whatsapp` -> **Images** (JPEG or PNG, up to 5 MB). It is stored in the database; WhatsApp fetches it from a public
   link (`/api/whatsapp/media/<random token>`) when a message goes out. Requires `SITE_URL` to be the public address.
2. **Create a template** with that image as its **Header image** (the form has a picker, and can upload a new image too). Because the QR code is
   static, put the amount and the UPI ID in the text, for example:
   `Hello {{1}}, we have collected your samples for booking {{2}}. The amount due is {{3}}. Scan the QR code above with any UPI app to pay, or pay to UPI ID <your UPI ID>. Thank you for choosing Eazy Diagnostics.`
   Variables: 1 = recipient's first name, 2 = booking id, 3 = amount. Submit it to Meta; Meta reviews it together with the image, and changing the image
   later sends it back for review. Needs `WHATSAPP_APP_ID`.
3. **Map it** on **Template - Status Mapping** to the **Payment requested** event (patients only).

When it is sent:
- **Automatically**, when a visit's status changes to **Samples collected**, if Eazy Diagnostics collects payment for the order and payment is still **Pending**.
  This happens once per order (it is not repeated if the status goes round again).
- **By hand**, with **Request payment** next to the payment status on the order page, while payment is Pending. Use it for reminders: resending is allowed,
  except twice within 30 seconds.
- **Never** when the clinic collects payment, when payment is already Paid or Refunded, or when the visit is Cancelled.
- With no template mapped for Payment requested, nothing is sent and the admin is told (toast and audit log), like any other unmapped event.

Reconciliation is manual: when the money arrives, mark the order **Paid** (which sends the "payment received" message if one is mapped).

## Using `/admin/whatsapp`

- **Templates:** `+ New template` opens a form with the wording (insert variables from a menu), what fills each variable, the
  audience, an optional header image, and a live preview. The form does not choose events: that is done on the mapping tab. *Save and submit to Meta* sends it for review (usually minutes to a day);
  its status then follows Meta's (In review -> Approved / Rejected, with the reason). From the table you can edit, switch a template
  on or off, send a test of an approved one to your own phone, resubmit a rejected one, or delete it (also from Meta).
  Rewording an approved template sends it back for review; until it is approved again nothing is sent for the statuses mapped to it.
  Switching a template off has the same effect.
- **Template - Status Mapping:** choose, from the existing templates, which one each event uses for patients and for doctors. Leave it on
  "Not mapped" and that audience gets nothing for that status. Templates cannot be created here. Choosing a template switches it on and
  takes the event off the one that had it (one template per event per audience).
- **Images:** the image library for template headers (upload, see which templates use each, delete unused ones).
- **Message log:** every message about an order, with template, recipient and Sent / Delivered / Read / Failed, filterable and paged.
- **Connection:** which settings are present, a connection test, and what to enter in Meta's webhook setup.
- **Who a template is for.** Meta does not record this, so a template brought in by Sync is set to Doctors if its name plainly says so (for example `order_confirmed_doctor`) and to Patients otherwise. "Sent to" can be changed at any time when editing a template (this removes any status mappings it had), and a draft can be saved before every variable is mapped; all variables must be mapped before it is sent to Meta. A template only appears in a column of the mapping tab if it is for that audience.
- **Sync with Meta** pulls every template's status, brings in templates that exist only at Meta (switched off and unmapped, so they
  are not used until you set their events and variables), and flags ones Meta no longer has.

## Using `/admin/orders`

- Change a visit's status or payment; each change shows who was reached or why not. Open an order (`/admin/orders/<id>`) to see
  each member, upload their report PDF, set its status (No report yet -> Partial report -> Full report), and read the order's audit log.
- **Reports:** a member has one report at a time; a full report replaces a partial one. Upload the lab's PDF with
  **Upload report** - saving a file never sends a message; only **Change status -> Update & notify** does. The saved file is
  shown in a preview pane on click so you can check the header before you notify. If the member's prescribing doctor is registered,
  the PDF is re-saved with that doctor's clinic header (clinic name, logo and address on the left; the doctor's name and
  qualifications on the right; long addresses and qualifications wrap onto further lines, and there is no rule underneath so the logo can be larger). In the lab's "CODE/NAME & ADDRESS" box the lab's partner name, address and phone number are removed from the page and the clinic's name and address are printed in their place (a very long address is shortened in the middle). The report's **REF. DOCTOR** field is set to the doctor named in the order's **Prescribed by** for that member: the registered doctor's name, or - when the patient typed a name that is not a registered doctor - that name (then nothing else on the report changes, and no clinic header is added). If no doctor is named, REF. DOCTOR stays as the lab printed it. Everything else the lab printed is left alone. With no registered doctor the report is kept exactly as the lab
  produced it. After changing a clinic's logo or a doctor's details, press **Rebuild header**.
- A failed message (template not approved yet / name mismatch, expired token, a number not on WhatsApp) is shown in red with the
  reason. It is not re-sent automatically: fix the cause, then set another status and back, or message the patient by hand.
- With no token configured, or no template mapped, changes are still saved and the toast and audit log say nothing was sent.

## Consent

Patients give their WhatsApp number at checkout "for report delivery", and doctors tick consent when they register. Make sure your
checkout and doctor sign-up text says that order updates will be sent on WhatsApp; Meta requires opt-in for business messages.
