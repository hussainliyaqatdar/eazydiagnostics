/**
 * Receives doctor registrations from the website and adds each one as a row in
 * this Google Sheet, and hands the rows back when the website asks for the list
 * (admin page, checkout "Prescribed by"). (Google Apps Script - this file is not part of the Next.js app;
 * it is kept here so the code you paste into Google is in version control.)
 *
 * SETUP (about 5 minutes)
 * 1. Create a Google Sheet, e.g. "Doctor sign-ups".
 * 2. In the sheet: Extensions > Apps Script. Delete the sample code, paste this
 *    whole file, and save.
 * 3. Project Settings (gear icon) > Script properties > Add script property:
 *      name: SECRET     value: a long random string you make up
 * 4. Deploy > New deployment > select type "Web app":
 *      Execute as: Me        Who has access: Anyone
 *    Click Deploy, approve the permissions when asked, and copy the "Web app URL".
 *    (Open that URL in a browser: it should say the endpoint is running.)
 * 5. On the website's server (Render > Environment) set:
 *      DOCTOR_SHEET_WEBHOOK_URL     = the Web app URL
 *      DOCTOR_SHEET_WEBHOOK_SECRET  = the same value as SECRET above
 *
 * After editing this script later: Deploy > Manage deployments > pencil icon >
 * Version: New version > Deploy (the URL stays the same).
 *
 * "Anyone" access only means the URL can be called; every request must carry the
 * SECRET or it is ignored, so keep the URL and the secret private.
 */

// A new tab name, so a sheet that already holds older sign-ups (with different
// columns) is left alone and the new columns get a fresh header row.
const SHEET_NAME = "Registered doctors";

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (!secret || data.secret !== secret) return reply({ ok: false, error: "unauthorized" });

    const book = SpreadsheetApp.getActiveSpreadsheet();

    // The website reads the registered doctors back (admin page, checkout list).
    if (data.action === "list") {
      const found = book.getSheetByName(SHEET_NAME);
      if (!found || found.getLastRow() === 0) return reply({ ok: true, columns: [], rows: [] });
      const values = found.getDataRange().getDisplayValues();
      return reply({ ok: true, columns: values[0], rows: values.slice(1) });
    }

    // Removes the row whose "Doctor ID" matches (admin page, delete a doctor).
    if (data.action === "delete") {
      if (typeof data.id !== "string" || !data.id) return reply({ ok: false, error: "bad request" });
      lock.waitLock(15000);
      const found = book.getSheetByName(SHEET_NAME);
      if (!found || found.getLastRow() < 2) return reply({ ok: false, error: "not found" });
      const values = found.getDataRange().getDisplayValues();
      const idCol = values[0].indexOf("Doctor ID");
      if (idCol < 0) return reply({ ok: false, error: "no Doctor ID column" });
      for (let i = values.length - 1; i >= 1; i--) {
        if (values[i][idCol] === data.id) {
          found.deleteRow(i + 1);
          return reply({ ok: true });
        }
      }
      return reply({ ok: false, error: "not found" });
    }

    if (!Array.isArray(data.columns) || !Array.isArray(data.values)) return reply({ ok: false, error: "bad request" });

    // Two doctors submitting at the same moment must not write to the same row.
    lock.waitLock(15000);

    const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      // Header row comes from the website, so the columns are defined in one place.
      sheet.getRange(1, 1, 1, data.columns.length).setValues([data.columns]).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, data.values.length);
    range.setNumberFormat("@"); // plain text, so a value starting with "=" is never run as a formula
    range.setValues([data.values.map(String)]);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// Lets you check the deployment by opening the Web app URL in a browser.
function doGet() {
  return reply({ ok: true, message: "Doctor sign-up endpoint is running." });
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
