import fs from "fs";
import path from "path";
import readline from "readline";
import { readFileSync, existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

// For state management
export enum StateType {
  Init = "init",
  HasDependentVariable = "dependent variable",
  HasIndependentVariable = "independent variable",
  HasBothVariables = "has both dependent variable and independent variable",
}

// Function to get the data file path for a given conversation ID
export function getDataFilePath(conversationId: string): string {
  const storagePath = process.env.STORAGE || process.cwd();
  return path.join(storagePath, `${conversationId}/stateData.json`);
}

// Function to read the state data from the file
export function readStateData(conversationId: string): StateData {
  const filePath = getDataFilePath(conversationId);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading state data:", err);
  }
  return { state: StateType.Init, variables: {} }; // Return default if file does not exist
}

// Function to write the state data to the file
export function writeStateData(conversationId: string, data: StateData): void {
  const filePath = getDataFilePath(conversationId);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true }); // Ensure the directory exists
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing state data:", err);
  }
}

// Define the allowable keys for the variables object
export type VariableKey = "independent_variable" | "dependent_variable";

// Define the structure for the variables object
export interface Variables {
  independent_variable?: string;
  dependent_variable?: string;
}

// Define the structure for the state data
export interface StateData {
  state: StateType;
  variables: Variables;
}

// Type guard to check if a key is a valid VariableKey
export function isValidVariableKey(key: any): key is VariableKey {
  return ["independent_variable", "dependent_variable"].includes(key);
}

// For file analysis
// Directory containing CSV files
const directoryPath = path.resolve(process.env.STORAGE as string);

// Function to guess the delimiter in a CSV line
function guessDelimiter(line: string): string {
  const delimiters = [",", ";", "\t", "|"];
  let maxCount = 0;
  let guessedDelimiter = ",";

  delimiters.forEach((delimiter) => {
    const count = line.split(delimiter).length - 1;
    if (count > maxCount) {
      maxCount = count;
      guessedDelimiter = delimiter;
    }
  });

  return guessedDelimiter;
}

async function readHeader(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      const delimiter = guessDelimiter(line);
      const headers = line.split(delimiter);
      resolve(headers);

      rl.close();
      fileStream.destroy();
    });

    rl.on("error", (err) => {
      reject("Error reading file: " + err);
    });
  });
}

// Function to check if the line is likely a header
async function isHeaderLine(line: string): Promise<boolean> {
  // A simple heuristic: if most of the items are not numbers, it's likely a header
  const items = line.split(/[\s,;]+/);
  const nonNumericItemCount = items.filter((item) =>
    isNaN(Number(item))
  ).length;
  return nonNumericItemCount > items.length / 2;
}

export async function readCSV(): Promise<{ [key: string]: string[] }> {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, async (err, files) => {
      if (err) {
        reject("Error reading directory: " + err);
        return;
      }

      let headers: { [key: string]: string[] } = {};

      for (const file of files) {
        if (path.extname(file).toLowerCase() === ".csv") {
          const filePath = path.join(directoryPath, file);
          const header = await readHeader(filePath);
          const isHeaderValid = await isHeaderLine(header[0] as string);
          if (isHeaderValid) {
            headers[file] = header;
          }
        }
      }

      resolve(headers);
    });
  });
}

export interface Message {
  sender: string;
  text: string;
  timestamp: Date;
}

const execAsync = promisify(exec);

export async function matchKeywords(
  directory: string,
  userSentence: string
): Promise<string[]> {
  const filePath = directory;

  if (!existsSync(filePath)) {
    return [];
  }

  let keywords = JSON.parse(readFileSync(filePath, "utf-8"));

  if (keywords.length === 0) {
    return [];
  }

  // Preprocess the user sentence (remove JSON structure and punctuations)
  userSentence = userSentence
    .replace(/[{[\]}]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

  try {
    const { stdout } = await execAsync(
      `python3 ./script/semantic_analysis.py "${userSentence}" ${directory}`
    );
    return JSON.parse(stdout);
  } catch (error) {
    console.error("Error calling the Python script:", error);
    return [];
  }
}

export async function sizeDownConversationHistory(
  conversationHistory: Array<{ sender: string; text: string }>
) {
  var limitedConversationHistory: Array<{ sender: string; text: string }> = [];
  const calculateTotalLength = (
    entries: Array<{ sender: string; text: string }>
  ) => {
    return entries.reduce(
      (total, entry) => total + JSON.stringify(entry).length,
      0
    );
  };

  // Determine how many of the last entries to include based on the total length
  console.log("debug 1");
  let entriesToInclude = 10;
  for (let i = 10; i > 0; i--) {
    const lastEntries = conversationHistory.slice(-i);
    if (calculateTotalLength(lastEntries) <= 20000) {
      entriesToInclude = i;
      break;
    }
  }

  // If even the last entry is too long, we don't include anything
  if (entriesToInclude > 0) {
    const lastEntries = conversationHistory.slice(-entriesToInclude);
    limitedConversationHistory.push(...lastEntries);
  }
  console.log("debug 2");

  return limitedConversationHistory;
}
