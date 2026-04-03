/**
 * Vishu Shoot 2026 — Web App
 *
 * SETUP
 * -----
 * A) Spreadsheet ID: open your Google Sheet → copy the ID from the URL:
 *    https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
 *
 * B) Tell the script which spreadsheet to use — pick ONE:
 *
 *    Option 1 — Code (line ~27): replace YOUR_SPREADSHEET_ID with the real id from the URL.
 *
 *    Option 2 — Script properties (recommended): Project Settings (gear) → Script properties
 *      → Add row: Property = SHEET_ID, Value = (paste id from URL)
 *
 *    Option 3 — Run `saveSheetIdToScriptProperties` once (uses SHEET_ID from the top of this file).
 *
 *    Optional: PHOTOS_FOLDER_ID — if set, photos go there. If unset, a folder
 *      "Vishu Shoot 2026 — registrations" is auto-created in My Drive (first run).
 *
 * C) Run `setupSheetHeaders` once (▶ Run → authorize all scopes).
 *
 * D) Deploy → New deployment → Select type: Web app
 *      Execute as: Me
 *      Who has access: Anyone
 *    Copy the Web App URL → Next.js `.env.local`: GAS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
 *
 * JSON from your site (POST): fullName, age, height, location, gender, whatsapp, instagram,
 *   videoPresentation, actingInterest, dancer, professionalModel, minimumCosting,
 *   photos: [ { name, mimeType, dataBase64 } ]
 */

/** Paste id from: https://docs.google.com/spreadsheets/d/<THIS_PART>/edit — or use Script properties / saveSheetIdToScriptProperties */
var SHEET_ID = "1A9JSDomu2c8IwBedP399JRjZYZ6InTQvV8NvFTXx0P0";
/** Tab to write rows to. Default "Sheet1" matches the first sheet you see. Use "Registrations" if you prefer a separate tab. */
var SHEET_NAME = "Sheet1";
/** Drive folder ID from folder URL, or "" to skip saving images (rows still save). */
var PHOTOS_FOLDER_ID = "";

/**
 * Run once (optional): copies `SHEET_ID` from the top of this file into Script properties.
 * Handy if you prefer properties over the var; `getConfig_` already reads either.
 */
function saveSheetIdToScriptProperties() {
  var id = SHEET_ID;
  if (!id || id === "YOUR_SPREADSHEET_ID") {
    throw new Error(
      "Set var SHEET_ID at the top of this file to your spreadsheet id (from the Sheet URL between /d/ and /edit)."
    );
  }
  PropertiesService.getScriptProperties().setProperty("SHEET_ID", id);
}

function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    sheetId: (p.getProperty("SHEET_ID") || SHEET_ID || "").trim(),
    sheetName: (p.getProperty("SHEET_NAME") || SHEET_NAME || "Sheet1").trim(),
    photosFolderId: (p.getProperty("PHOTOS_FOLDER_ID") || PHOTOS_FOLDER_ID || "").trim(),
  };
}

function getHeaderRow_() {
  return [
    "Submitted At",
    "Full Name",
    "Age",
    "Height",
    "Location",
    "Gender",
    "WhatsApp",
    "Instagram",
    "Video Presentation",
    "Acting Interest",
    "Dancer",
    "Professional Model",
    "Minimum Costing",
    "Photo URLs",
  ];
}

/** Ensures row 1 has column titles when the sheet is new or row 1 is blank. */
function ensureHeaders_(sheet) {
  var headers = getHeaderRow_();
  if (sheet.getLastRow() < 1) {
    sheet.appendRow(headers);
    return;
  }
  var first = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var empty = true;
  for (var c = 0; c < first.length; c++) {
    if (String(first[c]).trim() !== "") {
      empty = false;
      break;
    }
  }
  if (empty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/**
 * Opens the spreadsheet tab by name; creates the tab + headers if missing.
 * If the tab is named "Sheet1" but your locale renamed the first tab, uses the first sheet.
 */
function getRegistrationSheet_(cfg) {
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheet = ss.getSheetByName(cfg.sheetName);
  if (!sheet) {
    if (cfg.sheetName === "Sheet1" && ss.getSheets().length > 0) {
      sheet = ss.getSheets()[0];
    } else {
      sheet = ss.insertSheet(cfg.sheetName);
    }
  }
  ensureHeaders_(sheet);
  return sheet;
}

var AUTO_PHOTOS_FOLDER_NAME = "Vishu Shoot 2026 — registrations";

/**
 * Where to save uploaded images. Uses PHOTOS_FOLDER_ID if set; otherwise finds or
 * creates AUTO_PHOTOS_FOLDER_NAME in My Drive and caches the id in Script properties.
 */
function getPhotosFolderForUpload_(cfg) {
  if (cfg.photosFolderId) {
    return DriveApp.getFolderById(cfg.photosFolderId);
  }
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty("AUTO_PHOTOS_FOLDER_ID");
  if (cached) {
    try {
      return DriveApp.getFolderById(cached);
    } catch (e) {
      /* folder deleted or permission; recreate below */
    }
  }
  var it = DriveApp.getFoldersByName(AUTO_PHOTOS_FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(AUTO_PHOTOS_FOLDER_NAME);
  props.setProperty("AUTO_PHOTOS_FOLDER_ID", folder.getId());
  return folder;
}

/** Quick test: open the Web App URL in a browser (GET). Should return JSON. */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      service: "vishu-register",
      hint: "POST JSON registrations to this URL from your Next.js /api/register proxy.",
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var out = { ok: false };
  try {
    var cfg = getConfig_();
    if (!cfg.sheetId || cfg.sheetId === "YOUR_SPREADSHEET_ID") {
      out.error =
        "Missing SHEET_ID. Open your Google Sheet, copy the id from the URL " +
        "(between /d/ and /edit). Then either: (1) set var SHEET_ID in code, " +
        "(2) Project Settings → Script properties → SHEET_ID = that id, or " +
        "(3) run saveSheetIdToScriptProperties() once with the id filled in.";
      return jsonResponse_(out);
    }

    if (!e.postData || !e.postData.contents) {
      out.error = "No POST body";
      return jsonResponse_(out);
    }

    var data = JSON.parse(e.postData.contents);
    var sheet = getRegistrationSheet_(cfg);

    var photoUrls = [];
    if (data.photos && data.photos.length) {
      var folder = getPhotosFolderForUpload_(cfg);
      var stamp = Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "yyyyMMdd-HHmmss"
      );
      for (var i = 0; i < data.photos.length; i++) {
        var ph = data.photos[i];
        if (!ph.dataBase64) continue;
        var mime = ph.mimeType || "image/jpeg";
        var ext = mime.indexOf("png") !== -1 ? "png" : "jpg";
        var safeName = String(ph.name || "photo").replace(/[^\w.\-]/g, "_");
        var fname =
          stamp + "-" + (i + 1) + "-" + safeName + "." + ext;
        var blob = Utilities.newBlob(
          Utilities.base64Decode(ph.dataBase64),
          mime,
          fname
        );
        var file = folder.createFile(blob);
        photoUrls.push(file.getUrl());
      }
    }

    sheet.appendRow([
      new Date(),
      data.fullName || "",
      data.age || "",
      data.height || "",
      data.location || "",
      data.gender || "",
      data.whatsapp || "",
      data.instagram || "",
      data.videoPresentation || "",
      data.actingInterest || "",
      data.dancer || "",
      data.professionalModel || "",
      data.minimumCosting || "",
      photoUrls.join("\n"),
    ]);

    out.ok = true;
    return jsonResponse_(out);
  } catch (err) {
    out.error = String(err);
    return jsonResponse_(out);
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Run once from the editor (▶ Run).
 * Creates tab "Registrations" and row 1 headers if missing.
 */
function setupSheetHeaders() {
  var cfg = getConfig_();
  if (!cfg.sheetId || cfg.sheetId === "YOUR_SPREADSHEET_ID") {
    throw new Error(
      "Set SHEET_ID: replace YOUR_SPREADSHEET_ID in code, or Script properties SHEET_ID, or run saveSheetIdToScriptProperties()."
    );
  }
  getRegistrationSheet_(cfg);
}
