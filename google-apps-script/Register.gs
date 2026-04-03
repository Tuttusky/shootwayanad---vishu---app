/**
 * Vishu Shoot 2026 — Web App (Register.gs)
 *
 * Your Next.js site posts JSON to `/api/register`, which forwards the same body here
 * (env: GAS_WEB_APP_URL → Web App URL ending in `/exec`). Analytics (GA, Clarity) run
 * only in the browser — this script does not load them.
 *
 * SETUP
 * -----
 * A) Spreadsheet ID: open your Google Sheet → copy the ID from the URL:
 *    https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
 *
 * B) Tell the script which spreadsheet to use — pick ONE:
 *
 *    Option 1 — Code (below): set SHEET_ID to the real id from the URL.
 *
 *    Option 2 — Script properties (recommended): Project Settings (gear) → Script properties
 *      → Add row: Property = SHEET_ID, Value = (paste id from URL)
 *
 *    Option 3 — Run `saveSheetIdToScriptProperties` once (uses SHEET_ID from the top of this file).
 *
 *    Optional: PHOTOS_FOLDER_ID — if set, photos go there. If unset, a folder
 *      "Vishu Shoot 2026 — registrations" is auto-created in My Drive (first run).
 *
 *    Categories → tabs inside ONE spreadsheet (default):
 *      Set SHEET_ID only. On each registration POST, the matching worksheet tab is
 *      auto-created if missing (Female, Kids, Male, Mature Women, Mature Men).
 *      Row 1 headers are written automatically. Legacy `/form` without category uses tab SHEET_NAME (default Sheet1).
 *
 *    Optional — separate Google Spreadsheet per category (advanced):
 *      Set SHEET_ID_FEMALE, SHEET_ID_KIDS, … in code or Script properties; that category
 *      posts to that file instead. If blank, that category uses SHEET_ID + tab name above.
 *
 *      Run `setupAllCategorySheets()` once to pre-create all category tabs + headers.
 *
 * C) Run `setupSheetHeaders` once (▶ Run → authorize all scopes).
 *
 * D) Deploy → New deployment → Select type: Web app
 *      Execute as: Me
 *      Who has access: Anyone
 *    Copy the Web App URL → Vercel + `.env.local`: GAS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
 *    Redeploy the Apps Script after pasting updated code; update GAS_WEB_APP_URL if the `/exec` URL changes.
 *
 * JSON POST body (same as Next.js payload): fullName, age, height, location, gender,
 *   category (string; multi = "a; b"), categories (optional string[] — merged into Category column),
 *   whatsapp, alreadyInWAGroup, instagram, videoPresentation, actingInterest, dancer,
 *   professionalModel (or prof_model), minimumCosting, ageCategory, registrationForm ("kids" | "main"),
 *   talents (trimmed to 800 chars server-side), photos: [ { name, mimeType, dataBase64 } ]
 *   Kids: ageCategory = kid, registrationForm = kids, height may be "—".
 */

/** Fallback when `ageCategory` is not sent (legacy links). Prefer per-category ids below. */
var SHEET_ID = "1A9JSDomu2c8IwBedP399JRjZYZ6InTQvV8NvFTXx0P0";
var SHEET_NAME = "Sheet1";

/** Female (Ages 19–30) — landing → /form?category=female */
var SHEET_ID_FEMALE = "";
var SHEET_NAME_FEMALE = "Sheet1";
/** Kid (Ages 5–18) — /form/kids */
var SHEET_ID_KIDS = "";
var SHEET_NAME_KIDS = "Sheet1";
/** Male (Ages 19–30) */
var SHEET_ID_MALE = "";
var SHEET_NAME_MALE = "Sheet1";
/** Mature Women (30–55) */
var SHEET_ID_MATURE_WOMEN = "";
var SHEET_NAME_MATURE_WOMEN = "Sheet1";
/** Mature Men (30–55) */
var SHEET_ID_MATURE_MEN = "";
var SHEET_NAME_MATURE_MEN = "Sheet1";

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

/**
 * Run once: copies SHEET_ID_KIDS from the top of this file into Script properties.
 */
function saveKidsSheetIdToScriptProperties() {
  var id = SHEET_ID_KIDS;
  if (!id || id === "YOUR_SPREADSHEET_ID") {
    throw new Error(
      "Set var SHEET_ID_KIDS at the top of this file to your kids-only spreadsheet id " +
        "(from the Sheet URL between /d/ and /edit)."
    );
  }
  PropertiesService.getScriptProperties().setProperty("SHEET_ID_KIDS", id);
}

function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    sheetId: (p.getProperty("SHEET_ID") || SHEET_ID || "").trim(),
    sheetName: (p.getProperty("SHEET_NAME") || SHEET_NAME || "Sheet1").trim(),
    sheetIdFemale: (p.getProperty("SHEET_ID_FEMALE") || SHEET_ID_FEMALE || "").trim(),
    sheetNameFemale: (p.getProperty("SHEET_NAME_FEMALE") || SHEET_NAME_FEMALE || "Sheet1").trim(),
    sheetIdKids: (p.getProperty("SHEET_ID_KIDS") || SHEET_ID_KIDS || "").trim(),
    sheetNameKids: (p.getProperty("SHEET_NAME_KIDS") || SHEET_NAME_KIDS || "Sheet1").trim(),
    sheetIdMale: (p.getProperty("SHEET_ID_MALE") || SHEET_ID_MALE || "").trim(),
    sheetNameMale: (p.getProperty("SHEET_NAME_MALE") || SHEET_NAME_MALE || "Sheet1").trim(),
    sheetIdMatureWomen: (p.getProperty("SHEET_ID_MATURE_WOMEN") || SHEET_ID_MATURE_WOMEN || "").trim(),
    sheetNameMatureWomen: (p.getProperty("SHEET_NAME_MATURE_WOMEN") || SHEET_NAME_MATURE_WOMEN || "Sheet1").trim(),
    sheetIdMatureMen: (p.getProperty("SHEET_ID_MATURE_MEN") || SHEET_ID_MATURE_MEN || "").trim(),
    sheetNameMatureMen: (p.getProperty("SHEET_NAME_MATURE_MEN") || SHEET_NAME_MATURE_MEN || "Sheet1").trim(),
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
    "Talents",
    "Gender",
    "Category",
    "WhatsApp",
    "Already in WA Group",
    "Instagram",
    "Video Presentation",
    "Acting Interest",
    "Dancer",
    "Professional Model",
    "Minimum Costing",
    "Photo URLs",
    "Age Category",
    "Registration Form",
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
  if (
    lastTitle !== "Photo URLs" &&
    lastTitle !== "Age Category" &&
    lastTitle !== "Registration Form" &&
    lastTitle !== "Talents"
  ) {
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

function getCategory_(data) {
  /** Multiple interests from Next.js: categories: string[] or category: "a; b; c" */
  if (data.categories != null && Object.prototype.toString.call(data.categories) === "[object Array]") {
    var parts = [];
    for (var i = 0; i < data.categories.length; i++) {
      var s = String(data.categories[i] != null ? data.categories[i] : "").trim();
      if (s) parts.push(s);
    }
    if (parts.length) return parts.join("; ");
  }
  var v = data.category != null ? String(data.category) : "";
  if (v) return v;
  if (data.Category != null) return String(data.Category);
  return "";
}

/** Matches Next.js talents field max length (safety for Sheets + payload). */
var TALENTS_MAX_LEN = 800;

function truncateTalents_(s) {
  var t = String(s || "");
  if (t.length <= TALENTS_MAX_LEN) return t;
  return t.slice(0, TALENTS_MAX_LEN);
}

function getTalents_(data) {
  var v = data.talents != null ? String(data.talents) : "";
  if (!v && data.Talents != null) v = String(data.Talents);
  return truncateTalents_(v);
}

/** Professional model yes/no — supports prof_model alias from forms. */
function getProfessionalModel_(data) {
  var v = data.professionalModel != null ? String(data.professionalModel) : "";
  if (v) return v;
  if (data.prof_model != null) return String(data.prof_model);
  if (data.ProfessionalModel != null) return String(data.ProfessionalModel);
  return "";
}

/** Sheet column "Already in WA Group" — always stored as lowercase yes / no. */
function alreadyInWAGroup_(data) {
  var v = data.alreadyInWAGroup;
  if (v === true || v === "true" || v === "yes") return "yes";
  if (v === false || v === "false" || v === "no") return "no";
  return "no";
}

/** kid | female | male | mature_women | mature_men (from landing). */
function getAgeCategory_(data) {
  var v = data.ageCategory != null ? String(data.ageCategory) : "";
  if (v) return v;
  if (data.AgeCategory != null) return String(data.AgeCategory);
  return "";
}

/** kids | main — which UI submitted the row. */
function getRegistrationForm_(data) {
  var v = data.registrationForm != null ? String(data.registrationForm) : "";
  if (v) return v;
  if (data.RegistrationForm != null) return String(data.RegistrationForm);
  return "";
}

function buildRow_(data, photoCell) {
  return [
    new Date(),
    data.fullName || "",
    data.age || "",
    data.height || "",
    data.location || "",
    getTalents_(data),
    getGender_(data),
    getCategory_(data),
    data.whatsapp || "",
    alreadyInWAGroup_(data),
    data.instagram || "",
    data.videoPresentation || "",
    data.actingInterest || "",
    getDancer_(data),
    getProfessionalModel_(data),
    data.minimumCosting || "",
    photoCell,
    getAgeCategory_(data),
    getRegistrationForm_(data),
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

/** True when this POST should go to the kids-only spreadsheet. */
function isKidsRegistration_(data) {
  var rf = data.registrationForm != null ? String(data.registrationForm).toLowerCase() : "";
  if (rf === "kids") return true;
  var ac = data.ageCategory != null ? String(data.ageCategory).toLowerCase() : "";
  if (ac === "kid") return true;
  return false;
}

/**
 * Routing key from JSON: kid | female | male | mature_women | mature_men | "" (legacy).
 */
function getCategoryRoutingKey_(data) {
  if (isKidsRegistration_(data)) return "kid";
  var ac = data.ageCategory != null ? String(data.ageCategory).toLowerCase() : "";
  if (ac === "female" || ac === "male" || ac === "mature_women" || ac === "mature_men") return ac;
  return "";
}

/**
 * Worksheet tab name for one category (inside the main SHEET_ID spreadsheet).
 * Tabs are auto-created on first registration for that category.
 */
function getSheetTabNameForRouteKey_(routeKey) {
  if (routeKey === "kid") return "Kids";
  if (routeKey === "female") return "Female";
  if (routeKey === "male") return "Male";
  if (routeKey === "mature_women") return "Mature Women";
  if (routeKey === "mature_men") return "Mature Men";
  return "Registrations";
}

/**
 * Returns { sheetId, sheetName } — sheetName is the worksheet tab name inside the spreadsheet.
 * routeKey: kid | female | male | mature_women | mature_men | ""
 *
 * If SHEET_ID_FEMALE (etc.) is set to another spreadsheet id, that file + its tab name is used.
 * If blank, uses main SHEET_ID + auto tab name from getSheetTabNameForRouteKey_ (tab created if missing).
 */
function getSheetTargetForCategoryKey_(cfg, routeKey) {
  var t;
  if (routeKey === "kid") {
    t = { sheetId: cfg.sheetIdKids, sheetName: cfg.sheetNameKids };
  } else if (routeKey === "female") {
    t = { sheetId: cfg.sheetIdFemale, sheetName: cfg.sheetNameFemale };
  } else if (routeKey === "male") {
    t = { sheetId: cfg.sheetIdMale, sheetName: cfg.sheetNameMale };
  } else if (routeKey === "mature_women") {
    t = { sheetId: cfg.sheetIdMatureWomen, sheetName: cfg.sheetNameMatureWomen };
  } else if (routeKey === "mature_men") {
    t = { sheetId: cfg.sheetIdMatureMen, sheetName: cfg.sheetNameMatureMen };
  } else {
    return { sheetId: cfg.sheetId, sheetName: cfg.sheetName };
  }
  var id = String(t.sheetId || "").trim();
  if (id && id !== "YOUR_SPREADSHEET_ID") return t;
  return {
    sheetId: cfg.sheetId,
    sheetName: getSheetTabNameForRouteKey_(routeKey),
  };
}

/** Returns null if OK, or an error message for the client. */
function validateCategorySheetConfigured_(cfg, routeKey) {
  var t = getSheetTargetForCategoryKey_(cfg, routeKey);
  if (t.sheetId && t.sheetId !== "YOUR_SPREADSHEET_ID") return null;
  return (
    "Spreadsheet not set. Set SHEET_ID in code or Script properties " +
      "(Project Settings → Script properties). Category tabs are created automatically inside that spreadsheet."
  );
}

/** Digits only; compare last 10 digits so +91 / 91 / spacing variants match. */
function normalizePhoneDigits_(s) {
  var d = String(s || "").replace(/\D/g, "");
  if (d.length > 10) return d.slice(-10);
  return d;
}

/** 1-based column index for exact header text (case-insensitive), or -1. */
function findHeaderColumn1Based_(sheet, headerName) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return -1;
  var row = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var want = String(headerName).trim().toLowerCase();
  for (var c = 0; c < row.length; c++) {
    if (String(row[c]).trim().toLowerCase() === want) return c + 1;
  }
  return -1;
}

/** True if WhatsApp column already has this number (10+ digit match). */
function whatsappExistsInSheet_(sheet, incomingRaw) {
  var want = normalizePhoneDigits_(incomingRaw);
  if (!want || want.length < 10) return false;
  var col = findHeaderColumn1Based_(sheet, "WhatsApp");
  if (col < 1) return false;
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var vals = sheet.getRange(2, col, last, col).getValues();
  for (var r = 0; r < vals.length; r++) {
    var ex = normalizePhoneDigits_(vals[r][0]);
    if (ex && ex === want) return true;
  }
  return false;
}

/** Same number cannot register twice across any tab in this spreadsheet. */
function whatsappExistsInSpreadsheet_(spreadsheet, incomingRaw) {
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (whatsappExistsInSheet_(sheets[i], incomingRaw)) return true;
  }
  return false;
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
      schemaColumns: 19,
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var out = { ok: false };
  try {
    var cfg = getConfig_();
    if (!e.postData || !e.postData.contents) {
      out.error = "No POST body";
      return jsonResponse_(out);
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      out.error = "Invalid JSON body. Ensure the client sends application/json (Next.js /api/register proxy).";
      return jsonResponse_(out);
    }
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      out.error = "JSON must be an object.";
      return jsonResponse_(out);
    }
    var routeKey = getCategoryRoutingKey_(data);
    var cfgErr = validateCategorySheetConfigured_(cfg, routeKey);
    if (cfgErr) {
      out.error = cfgErr;
      return jsonResponse_(out);
    }

    var target = getSheetTargetForCategoryKey_(cfg, routeKey);
    var waRaw = data.whatsapp != null ? String(data.whatsapp) : "";
    var ss = SpreadsheetApp.openById(target.sheetId);
    if (whatsappExistsInSpreadsheet_(ss, waRaw)) {
      out.error = "This WhatsApp number is already registered.";
      return jsonResponse_(out);
    }

    var sheet = getRegistrationSheet_(target);

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

/**
 * Run once per category after the matching SHEET_ID_* is set.
 * routeKey: "female" | "kid" | "male" | "mature_women" | "mature_men"
 */
function setupSheetHeadersForCategory(routeKey) {
  var cfg = getConfig_();
  var err = validateCategorySheetConfigured_(cfg, routeKey);
  if (err) throw new Error(err);
  var t = getSheetTargetForCategoryKey_(cfg, routeKey);
  getRegistrationSheet_(t);
}

/**
 * Run once: pre-creates every category tab + headers inside SHEET_ID (or each override spreadsheet).
 */
function setupAllCategorySheets() {
  var keys = ["female", "kid", "male", "mature_women", "mature_men"];
  var cfg = getConfig_();
  if (!cfg.sheetId || cfg.sheetId === "YOUR_SPREADSHEET_ID") {
    throw new Error("Set SHEET_ID in code or Script properties.");
  }
  for (var i = 0; i < keys.length; i++) {
    var t = getSheetTargetForCategoryKey_(cfg, keys[i]);
    getRegistrationSheet_(t);
  }
}

/**
 * Overwrites row 1 for one category spreadsheet (same columns as main).
 * routeKey: "female" | "kid" | "male" | "mature_women" | "mature_men"
 */
function forceHeadersRow1ForCategory(routeKey) {
  var cfg = getConfig_();
  var t = getSheetTargetForCategoryKey_(cfg, routeKey);
  if (!t.sheetId) {
    throw new Error("Set SHEET_ID.");
  }
  var sheet = getRegistrationSheet_(t);
  var headers = getHeaderRow_();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

/** @deprecated Use setupSheetHeadersForCategory("kid"). */
function setupKidsSheetHeaders() {
  setupSheetHeadersForCategory("kid");
}

/** @deprecated Use forceHeadersRow1ForCategory("kid"). */
function forceHeadersRow1Kids() {
  forceHeadersRow1ForCategory("kid");
}

/**
 * Copies all non-empty SHEET_ID_* vars from the top of this file into Script properties.
 */
function saveAllCategorySheetIdsToScriptProperties() {
  var p = PropertiesService.getScriptProperties();
  if (SHEET_ID_FEMALE) p.setProperty("SHEET_ID_FEMALE", SHEET_ID_FEMALE);
  if (SHEET_ID_KIDS) p.setProperty("SHEET_ID_KIDS", SHEET_ID_KIDS);
  if (SHEET_ID_MALE) p.setProperty("SHEET_ID_MALE", SHEET_ID_MALE);
  if (SHEET_ID_MATURE_WOMEN) p.setProperty("SHEET_ID_MATURE_WOMEN", SHEET_ID_MATURE_WOMEN);
  if (SHEET_ID_MATURE_MEN) p.setProperty("SHEET_ID_MATURE_MEN", SHEET_ID_MATURE_MEN);
}
