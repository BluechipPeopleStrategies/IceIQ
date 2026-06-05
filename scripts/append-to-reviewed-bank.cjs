const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const aiPipelinePath = path.join(root, "docs", "ai-pipeline");
const reviewedBankPath = path.join(
  aiPipelinePath,
  "_reviewed-bank.json",
);
const reviewedIncomingPath = path.join(
  aiPipelinePath,
  "reviewed-incoming.json",
);
const reviewedArchivePath = path.join(aiPipelinePath, "archive", "reviewed");

function readJsonFile(filePath, allowEmpty = false) {
  if (!fs.existsSync(filePath)) {
    return allowEmpty ? [] : null;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  if (allowEmpty && fileContent.trim().length === 0) {
    return [];
  }

  try {
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(
      `Failed to parse ${path.basename(filePath)}: ${error.message}`,
    );
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function getTimestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getRelativePath(filePath) {
  return path.relative(root, filePath);
}

function archiveReviewedBatch(items) {
  fs.mkdirSync(reviewedArchivePath, { recursive: true });

  const archivePath = path.join(
    reviewedArchivePath,
    `reviewed-incoming-${getTimestampForFilename()}.json`,
  );
  writeJsonFile(archivePath, items);

  return archivePath;
}

function hasUsableId(item) {
  return (
    Object.prototype.hasOwnProperty.call(item, "id") &&
    item.id !== null &&
    String(item.id).trim().length > 0
  );
}

function validateReviewedIncomingArray(items) {
  if (!Array.isArray(items)) {
    throw new Error("reviewed-incoming.json must be a JSON array.");
  }

  items.forEach((item, index) => {
    if (item == null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        `reviewed-incoming.json item at index ${index} must be an object with an id.`,
      );
    }
    if (!hasUsableId(item)) {
      throw new Error(
        `reviewed-incoming.json item at index ${index} is missing required property "id".`,
      );
    }
  });
}

function main() {
  let reviewedIncoming;
  try {
    reviewedIncoming = readJsonFile(reviewedIncomingPath);
  } catch (error) {
    console.error(`Error reading reviewed-incoming.json: ${error.message}`);
    process.exit(1);
  }

  try {
    validateReviewedIncomingArray(reviewedIncoming);
  } catch (error) {
    console.error(`Invalid reviewed-incoming.json: ${error.message}`);
    process.exit(1);
  }

  let reviewedBank;
  try {
    reviewedBank = readJsonFile(reviewedBankPath, true);
  } catch (error) {
    console.error(`Error reading _reviewed-bank.json: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(reviewedBank)) {
    console.error("_reviewed-bank.json must contain a JSON array.");
    process.exit(1);
  }

  const existingIds = new Set(reviewedBank.map((item) => item && item.id));
  const added = [];
  let skipped = 0;

  reviewedIncoming.forEach((item) => {
    if (existingIds.has(item.id)) {
      skipped += 1;
      return;
    }
    existingIds.add(item.id);
    added.push(item);
  });

  const newReviewedBank = reviewedBank.concat(added);
  try {
    writeJsonFile(reviewedBankPath, newReviewedBank);
  } catch (error) {
    console.error(`Error writing _reviewed-bank.json: ${error.message}`);
    process.exit(1);
  }

  console.log(`Appended ${added.length} item(s) to _reviewed-bank.json.`);
  console.log(`Skipped ${skipped} duplicate item(s) by id.`);
  console.log(
    `_reviewed-bank.json now has ${newReviewedBank.length} total item(s).`,
  );

  let archivePath;
  try {
    archivePath = archiveReviewedBatch(reviewedIncoming);
  } catch (error) {
    console.error(`Error archiving reviewed-incoming.json: ${error.message}`);
    console.error("reviewed-incoming.json was not cleared.");
    process.exit(1);
  }

  try {
    writeJsonFile(reviewedIncomingPath, []);
  } catch (error) {
    console.error(`Error clearing reviewed-incoming.json: ${error.message}`);
    console.error(
      `Archived batch remains at ${getRelativePath(archivePath)}.`,
    );
    process.exit(1);
  }

  console.log(`Archived reviewed batch to ${getRelativePath(archivePath)}.`);
  console.log("Cleared reviewed-incoming.json back to an empty array.");
}

main();
