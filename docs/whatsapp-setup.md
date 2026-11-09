# WhatsApp order updates

When an order's status is changed on **/admin/orders**, the site WhatsApps the patient and, for some
statuses, the doctor who referred them. It uses Meta's WhatsApp Cloud API (the official WhatsApp Business API).

| Status | Patient | Referring doctor |
|---|---|---|
| Booked (new) | - | - |
| Confirmed | yes | - |
| Phlebotomist on the way | yes | - |
| Sample collected | yes | yes |
| At the lab - processing | yes | - |
| Report ready | yes | yes |
| Cancelled | yes | yes |

Change who hears about what in `NOTIFY` in `lib/order-status.ts`, and the wording in `patientLine` / `doctorLine` in the same file.
A doctor is messaged only if the patient picked them from the registered-doctors list (their number is the WhatsApp number
they gave at /for-doctors). Everyone named on a multi-member visit who gave their own WhatsApp number is also messaged.

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
6. On the server (e.g. Render -> Environment) set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.

WhatsApp only lets a business start a conversation with an approved template, which is why the wording lives in the variables
below instead of free text.

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

Open `/admin/orders`, pick a new status and press **Update & notify**. The page shows who was reached or why a message failed,
and every message is kept in the WhatsApp log column. Typical failures: template not approved yet / name mismatch, expired token,
or a number that is not on WhatsApp. A failed message is not re-sent automatically - fix the cause and set the status again
(set another status and back, or message the patient by hand).

## Consent

Patients give their WhatsApp number at checkout "for report delivery", and doctors tick consent when they register. Make sure your
checkout and doctor sign-up text says that order updates will be sent on WhatsApp; Meta requires opt-in for business messages.
