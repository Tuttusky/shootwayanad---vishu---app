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

/**
 * Writes row 1 to match getHeaderRow_() when the sheet is new, blank, or has
 * fewer columns than expected (e.g. before Gender / Dancer existed). Redeploy
 * the Web App after changing headers so POST uses the same column order.
 */
function ensureHeaders_(sheet) {
  var headers = getHeaderRow_();
  var need = headers.length;
  if (sheet.getLastRow() < 1) {
    sheet.appendRow(headers);
    return;
  }
  var lastCol = sheet.getLastColumn();
  var wide = Math.max(need, lastCol);
  var first = sheet.getRange(1, 1, 1, wide).getValues()[0];
  var empty = true;
  for (var c = 0; c < first.length; c++) {
    if (String(first[c]).trim() !== "") {
      empty = false;
      break;
    }
  }
  if (empty) {
    sheet.getRange(1, 1, 1, need).setValues([headers]);
    return;
  }
  if (lastCol < need) {
    sheet.getRange(1, 1, 1, need).setValues([headers]);
    return;
  }
  var lastTitle = String(sheet.getRange(1, lastCol).getValue()).trim();
  if (lastTitle !== "Photo URLs") {
    sheet.getRange(1, 1, 1, need).setValues([headers]);
  }
}

/** Reads gender / dancer from JSON with common key fallbacks. */
function getGender_(data) {
  var v = data.gender != null ? String(data.gender) : "";
  if (v) return v;
  if (data.Gender != null) return String(data.Gender);
  return "";
}

function getDancer_(data) {
  var v = data.dancer != null ? String(data.dancer) : "";
  if (v) return v;
  if (data.Dancer != null) return String(data.Dancer);
  return "";
}

function buildRow_(data, photoCell) {
  return [
    new Date(),
    data.fullName || "",
    data.age || "",
    data.height || "",
    data.location || "",
    getGender_(data),
    data.whatsapp || "",
    data.instagram || "",
    data.videoPresentation || "",
    data.actingInterest || "",
    getDancer_(data),
    data.professionalModel || "",
    data.minimumCosting || "",
    photoCell,
  ];
}

/**
 * Builds the Photo URLs cell: Drive links, or a short note if upload failed.
 */
function formatPhotoUrlsCell_(urls, uploadErrors, photos) {
  if (urls.length) {
    var cell = urls.join("\n");
    if (uploadErrors.length) {
      cell += "\n---\nWarnings: " + uploadErrors.slice(0, 3).join(" | ");
    }
    return cell;
  }
  if (photos && photos.length) {
    var names = [];
    for (var i = 0; i < photos.length; i++) {
      names.push(photos[i].name || "photo" + (i + 1));
    }
    var err =
      uploadErrors.length > 0 ? uploadErrors[0] : "Drive upload did not return URLs";
    return (
      photos.length +
      " file(s): " +
      names.join(", ") +
      " — " +
      err
    );
  }
  return "";
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
      schemaColumns: 13,
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
    var photoErrs = [];
    if (data.photos && data.photos.length) {
      var folder;
      try {
        folder = getPhotosFolderForUpload_(cfg);
      } catch (fe) {
        photoErrs.push("Drive folder: " + String(fe));
        folder = null;
      }
      var stamp = Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "yyyyMMdd-HHmmss"
      );
      if (folder) {
        for (var i = 0; i < data.photos.length; i++) {
          var ph = data.photos[i];
          if (!ph.dataBase64) {
            photoErrs.push("Photo " + (i + 1) + ": missing dataBase64");
            continue;
          }
          try {
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
          } catch (pe) {
            photoErrs.push("Photo " + (i + 1) + ": " + String(pe));
          }
        }
      }
    }

    var photoCell = formatPhotoUrlsCell_(photoUrls, photoErrs, data.photos || []);
    sheet.appendRow(buildRow_(data, photoCell));

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
 * Run once from the editor if Gender/Dancer columns are missing or mislabeled:
 * overwrites row 1 with the canonical header row from getHeaderRow_().
 * (Older rows may still be misaligned; new rows will match.)
 */
function forceHeadersRow1() {
  var cfg = getConfig_();
  if (!cfg.sheetId || cfg.sheetId === "YOUR_SPREADSHEET_ID") {
    throw new Error("Set SHEET_ID.");
  }
  var sheet = SpreadsheetApp.openById(cfg.sheetId).getSheetByName(cfg.sheetName);
  if (!sheet) {
    throw new Error("Sheet tab not found: " + cfg.sheetName);
  }
  var headers = getHeaderRow_();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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
