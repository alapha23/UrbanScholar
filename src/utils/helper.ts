import fs from "fs";
import path from "path";
import readline from "readline";

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

// Function to read keywords from a JSON file and match them against a user sentence
export async function matchKeywords(
  directory: string,
  userSentence: string
): Promise<string[]> {
  try {
    // Construct the full path to the keywords.json file
    const filePath = path.join(directory, "keywords.json");

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error("File does not exist.");
      return [];
    }

    // Read the file
    const data = fs.readFileSync(filePath, "utf8");
    const keywords: string[] = JSON.parse(data);

    // Check if the keyword list is empty
    if (keywords.length === 0) {
      console.error("Keyword list is empty.");
      return [];
    }

    // Preprocess the user sentence by removing JSON structure, punctuation, and converting to lowercase
    const processedSentence = userSentence
      .replace(/[{[\]}]/g, "") // Remove JSON-like structures
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
      .toLowerCase(); // Convert to lowercase

    // Split the processed sentence into words for comparison
    const sentenceWords = processedSentence.split(/\s+/);

    // Function to calculate relevance of a keyword to the user sentence
    const calculateRelevance = (keyword: string) => {
      const keywordWords = keyword.toLowerCase().split(" ");
      const commonWords = keywordWords.filter((word) =>
        sentenceWords.includes(word)
      );
      return commonWords.length;
    };

    // Sort keywords by relevance
    const sortedKeywords = keywords.sort(
      (a, b) => calculateRelevance(b) - calculateRelevance(a)
    );

    // Return the top 3 or fewer keywords
    return sortedKeywords.slice(0, 3);
  } catch (error) {
    console.error("An error occurred:", error);
    return [];
  }
}
