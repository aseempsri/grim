import XLSX from "xlsx";
import { makeImportKey, normStr, normNum } from "./importKey.js";

function cell(row, i) {
  const v = row[i];
  if (v === undefined || v === null) return "";
  return v;
}

export function parseMasterSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const out = [];
  for (let r = 2; r < data.length; r++) {
    const row = data[r];
    if (!row || !row.length) continue;
    const category = normStr(cell(row, 1));
    if (!category) continue;
    const subCategory = normStr(cell(row, 2));
    const location = normStr(cell(row, 3));
    const configurationAsset = normStr(cell(row, 4));
    const size = normStr(cell(row, 5));
    const priceRaw = cell(row, 6);
    const quotedPriceCr =
      priceRaw === "" || priceRaw === null || priceRaw === undefined ? null : Number(priceRaw);
    const remarks = normStr(cell(row, 7));
    const importKey = makeImportKey([category, subCategory, location, configurationAsset, size]);
    out.push({
      importKey,
      category,
      subCategory,
      location,
      configurationAsset,
      size,
      quotedPriceCr: quotedPriceCr !== null && Number.isFinite(quotedPriceCr) ? quotedPriceCr : null,
      remarks,
    });
  }
  return out;
}

export function parseUnderConstructionSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const out = [];
  for (let r = 2; r < data.length; r++) {
    const row = data[r];
    if (!row || !row.length) continue;
    const project = normStr(cell(row, 0));
    if (!project) continue;
    const location = normStr(cell(row, 1));
    const status = normStr(cell(row, 2));
    const configuration = normStr(cell(row, 3));
    const quotedPriceCr = normStr(cell(row, 4));
    const possession = normStr(cell(row, 5));
    const carpetAreaSqft = normStr(cell(row, 6));
    const saleableAreaSqft = normStr(cell(row, 7));
    const projectSize = normStr(cell(row, 8));
    const importKey = makeImportKey([project, location]);
    out.push({
      importKey,
      project,
      location,
      status,
      configuration,
      quotedPriceCr,
      possession,
      carpetAreaSqft,
      saleableAreaSqft,
      projectSize,
    });
  }
  return out;
}

export function parseCommercialSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const out = [];
  for (let r = 2; r < data.length; r++) {
    const row = data[r];
    if (!row || !row.length) continue;
    const assetType = normStr(cell(row, 0));
    if (!assetType) continue;
    const location = normStr(cell(row, 1));
    const description = normStr(cell(row, 2));
    const size = normStr(cell(row, 3));
    const priceRaw = cell(row, 4);
    const quotedPriceCr =
      priceRaw === "" || priceRaw === null || priceRaw === undefined ? null : Number(priceRaw);
    const remarks = normStr(cell(row, 5));
    const importKey = makeImportKey([assetType, location, description]);
    out.push({
      importKey,
      assetType,
      location,
      description,
      size,
      quotedPriceCr: quotedPriceCr !== null && Number.isFinite(quotedPriceCr) ? quotedPriceCr : null,
      remarks,
    });
  }
  return out;
}

export function parseLeaseSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const out = [];
  for (let r = 2; r < data.length; r++) {
    const row = data[r];
    if (!row || !row.length) continue;
    const serialNo = normNum(cell(row, 0));
    const project = normStr(cell(row, 1));
    if (!project) continue;
    const location = normStr(cell(row, 2));
    const status = normStr(cell(row, 3));
    const unitType = normStr(cell(row, 4));
    const sqftRaw = cell(row, 5);
    const sqft = sqftRaw === "" || sqftRaw === null ? null : Number(sqftRaw);
    const rentInr = normStr(cell(row, 6));
    const remarks = normStr(cell(row, 7));
    const importKey = makeImportKey([
      serialNo !== null && Number.isFinite(serialNo) ? String(serialNo) : "",
      project,
      location,
      status,
      unitType,
      String(sqft ?? ""),
    ]);
    out.push({
      importKey,
      serialNo,
      project,
      location,
      status,
      unitType,
      sqft: sqft !== null && Number.isFinite(sqft) ? sqft : null,
      rentInr,
      remarks,
    });
  }
  return out;
}

/**
 * @param {Buffer} buffer
 */
export function parseInventoryWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const names = wb.SheetNames;
  const find = (label) => names.find((n) => n.toLowerCase() === label.toLowerCase());

  const masterName = find("Master Inventory");
  const underName = find("Under construction");
  const commercialName = find("Commercial Sales");
  const leaseName = find("Lease Inventory");

  return {
    master: masterName ? parseMasterSheet(wb.Sheets[masterName]) : [],
    underConstruction: underName ? parseUnderConstructionSheet(wb.Sheets[underName]) : [],
    commercial: commercialName ? parseCommercialSheet(wb.Sheets[commercialName]) : [],
    lease: leaseName ? parseLeaseSheet(wb.Sheets[leaseName]) : [],
  };
}
