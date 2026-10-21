/**
 * Letts Get Clean — booking backend.
 * Paste this whole file into Extensions → Apps Script of your Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 *
 * Tabs it creates in the Sheet:
 *   Bookings — one row per booking. Change the "Status" column to Confirmed, Done or Cancelled.
 *              Cancelled frees the time slot on the website.
 *   Reviews  — one row per review. Untick "Show" to hide a review from the website.
 * You get an email at your Google address for every new booking.
 */

const TZ = 'America/New_York';
const BOOK_HEADERS = ['Booked at', 'Status', 'Date', 'Time', 'Name', 'Phone', 'Where', 'Address', 'Town', 'Car',
  'Package', 'Size', 'Extras', 'Total', 'How they heard', 'Notes', 'Launch price', 'ID'];
const REVIEW_HEADERS = ['Posted at', 'Show', 'Stars', 'Name', 'Review', 'ID'];

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#29C8FF');
    if (name === 'Bookings') {
      sh.getRange('C:D').setNumberFormat('@'); // keep dates/times as plain text
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Requested', 'Confirmed', 'Done', 'Cancelled'], true).build();
      sh.getRange('B2:B1000').setDataValidation(rule);
    }
    if (name === 'Reviews') sh.getRange('B2:B1000').insertCheckboxes();
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function d_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v || ''); }
function t_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'HH:mm');
  const s = String(v || '');
  return /^\d:\d\d$/.test(s) ? '0' + s : s;
}
function clean_(v, max) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, max || 200); }
function busyKeys_(fromDate) {
  const rows = sheet_('Bookings', BOOK_HEADERS).getDataRange().getValues().slice(1);
  return rows
    .filter(r => String(r[1]).toLowerCase() !== 'cancelled' && d_(r[2]) >= (fromDate || ''))
    .map(r => d_(r[2]) + '_' + t_(r[3]).replace(':', ''));
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'busy') return json_({ ok: true, busy: busyKeys_(p.from) });
  if (p.action === 'reviews') {
    const rows = sheet_('Reviews', REVIEW_HEADERS).getDataRange().getValues().slice(1);
    const reviews = rows.filter(r => r[1] === true).map(r => ({
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), stars: Number(r[2]) || 5, name: String(r[3] || ''), text: String(r[4] || '')
    })).reverse().slice(0, 60);
    return json_({ ok: true, reviews });
  }
  return json_({ ok: true, service: 'Letts Get Clean bookings' });
}

function doPost(e) {
  let b = {};
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  if (b.website) return json_({ ok: true }); // spam trap field

  if (b.action === 'book') {
    const date = clean_(b.date, 10), time = clean_(b.time, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return json_({ ok: false, error: 'bad_time' });
    if (!clean_(b.name) || clean_(b.phone).replace(/\D/g, '').length < 10) return json_({ ok: false, error: 'missing_contact' });
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      if (busyKeys_(date).indexOf(date + '_' + time.replace(':', '')) !== -1) return json_({ ok: false, error: 'taken' });
      const id = 'b' + Date.now().toString(36);
      const where = b.location === 'dropoff' ? 'Drop-off' : 'At customer';
      sheet_('Bookings', BOOK_HEADERS).appendRow([
        new Date(), 'Requested', date, time, clean_(b.name, 80), clean_(b.phone, 30), where,
        clean_(b.address, 150), clean_(b.town, 60), clean_(b.car, 80), clean_(b.packageName, 40), clean_(b.sizeLabel, 40),
        clean_((b.addons || []).join(', '), 150), Number(b.total) || 0, clean_(b.source, 30), clean_(b.notes, 500),
        b.deal ? 'Yes' : 'No', id
      ]);
      try {
        const me = Session.getEffectiveUser().getEmail();
        if (me) MailApp.sendEmail(me, 'New booking: ' + clean_(b.name) + ' · ' + date + ' ' + time,
          [clean_(b.packageName) + ' · ' + clean_(b.sizeLabel) + (b.addons && b.addons.length ? ' · ' + b.addons.join(', ') : ''),
           'Total: $' + (Number(b.total) || 0), 'When: ' + date + ' ' + time, 'Where: ' + where + (b.location === 'dropoff' ? ' (text them your address)' : ' · ' + clean_(b.address) + ', ' + clean_(b.town)),
           'Phone: ' + clean_(b.phone), 'Car: ' + clean_(b.car), 'Notes: ' + clean_(b.notes, 500), '', 'Open your Letts Get Clean sheet to confirm.'].join('\n'));
      } catch (mailErr) { /* email is optional */ }
      return json_({ ok: true, id });
    } finally { lock.releaseLock(); }
  }

  if (b.action === 'review') {
    const text = clean_(b.text, 800);
    if (text.length < 4) return json_({ ok: false, error: 'too_short' });
    const stars = Math.max(1, Math.min(5, Math.round(Number(b.stars) || 5)));
    sheet_('Reviews', REVIEW_HEADERS).appendRow([new Date(), true, stars, clean_(b.name, 40), text, 'r' + Date.now().toString(36)]);
    return json_({ ok: true });
  }
  return json_({ ok: false, error: 'unknown_action' });
}

/** Run this once from the editor (select setup → Run) to create the tabs and grant permissions. */
function setup() {
  sheet_('Bookings', BOOK_HEADERS);
  sheet_('Reviews', REVIEW_HEADERS);
  const first = SpreadsheetApp.getActive().getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && SpreadsheetApp.getActive().getSheets().length > 2) SpreadsheetApp.getActive().deleteSheet(first);
}
