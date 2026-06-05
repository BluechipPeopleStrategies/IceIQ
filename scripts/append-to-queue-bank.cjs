const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const aiPipelinePath = path.join(root, "docs", "ai-pipeline");
const queueBankPath = path.join(
  aiPipelinePath,
  "_queue-bank.json",
);
const incomingPath = path.join(aiPipelinePath, "incoming.json");
const rawArchivePath = path.join(aiPipelinePath, "archive", "raw");

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

function archiveIncomingBatch(items) {
  fs.mkdirSync(rawArchivePath, { recursive: true });

  const archivePath = path.join(
    rawArchivePath,
    `incoming-${getTimestampForFilename()}.json`,
  );
  writeJsonFile(archivePath, items);

  return archivePath;
}

function validateIncomingArray(items) {
  if (!Array.isArray(items)) {
    throw new Error("incoming.json must be a JSON array.");
  }

  items.forEach((item, index) => {
    if (item == null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        `incoming.json item at index ${index} must be an object with an id.`,
      );
    }
    if (!Object.prototype.hasOwnProperty.call(item, "id")) {
      throw new Error(
        `incoming.json item at index ${index} is missing required property \"id\".`,
      );
    }
  });
}

function main() {
  let incoming;
  try {
    incoming = readJsonFile(incomingPath);
  } catch (error) {
    console.error(`Error reading incoming.json: ${error.message}`);
    process.exit(1);
  }

  try {
    validateIncomingArray(incoming);
  } catch (error) {
    console.error(`Invalid incoming.json: ${error.message}`);
    process.exit(1);
  }

  let queueBank;
  try {
    queueBank = readJsonFile(queueBankPath, true);
  } catch (error) {
    console.error(`Error reading _queue-bank.json: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(queueBank)) {
    console.error("_queue-bank.json must contain a JSON array.");
    process.exit(1);
  }

  const existingIds = new Set(queueBank.map((item) => item && item.id));
  const added = [];
  let skipped = 0;

  incoming.forEach((item) => {
    if (existingIds.has(item.id)) {
      skipped += 1;
      return;
    }
    existingIds.add(item.id);
    added.push(item);
  });

  const newQueueBank = queueBank.concat(added);
  try {
    writeJsonFile(queueBankPath, newQueueBank);
  } catch (error) {
    console.error(`Error writing _queue-bank.json: ${error.message}`);
    process.exit(1);
  }

  console.log(`Appended ${added.length} item(s) to _queue-bank.json.`);
  console.log(`Skipped ${skipped} duplicate item(s) by id.`);
  console.log(`_queue-bank.json now has ${newQueueBank.length} total item(s).`);

  let archivePath;
  try {
    archivePath = archiveIncomingBatch(incoming);
  } catch (error) {
    console.error(`Error archiving incoming.json: ${error.message}`);
    console.error("incoming.json was not cleared.");
    process.exit(1);
  }

  try {
    writeJsonFile(incomingPath, []);
  } catch (error) {
    console.error(`Error clearing incoming.json: ${error.message}`);
    console.error(
      `Archived batch remains at ${getRelativePath(archivePath)}.`,
    );
    process.exit(1);
  }

  console.log(`Archived incoming batch to ${getRelativePath(archivePath)}.`);
  console.log("Cleared incoming.json back to an empty array.");
}

main();
