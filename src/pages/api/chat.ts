import type { NextApiRequest, NextApiResponse } from "next";
import { chatCall, chatCallJsonMode, chatCallWithTool } from "@/utils/openai";
import { readCSV } from "@/utils/helper";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const getCurrentDirname = (metaUrl: string) => {
  const __filename = fileURLToPath(metaUrl);
  return dirname(__filename);
};

async function executeScript(
  scriptPath: string,
  csvFilePath: string,
  dependent_var: string,
  independent_var: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `python ${scriptPath} ${csvFilePath} ${dependent_var} ${independent_var}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("Error: ", stderr);
          reject(error);
        }
        resolve(stdout.trim());
      }
    );
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { message, conversationHistory, task } = req.body;
    console.log(conversationHistory);
    if (task === "Analysis") {
      // verify input csv integrity

      var independent_var;
      var dependent_var;
      // acquire independent variable
      var prompt =
        'Seek the independent variable and the depedent variable. If there is either, then return in JSON format where there is a key called "error" \
        if there are both, return in JSON format where independent_var, dependent_var are the keys. Allow fuzzy spelling';
      prompt +=
        "\nThe chat history is:\n" + JSON.stringify(conversationHistory);

      const reply = await chatCallJsonMode(prompt + message, "");
      let reply_json = JSON.parse(reply);
      if ("error" in reply_json) {
        console.log(reply);
        res.status(200).json({
          message: reply_json["error"],
        });
        return;
      }

      // verify the name of the independent variable
      if (reply_json["independent_var"] == undefined) {
        console.log("Please specify the name of the independent variable");
        res.status(200).json({
          message: "Please specify the name of the independent variable",
        });
        return;
      }

      // acquire dependent variable
      if (reply_json["dependent_var"] == undefined) {
        console.log("Please specify the name of the independent variable");
        res.status(200).json({
          message: "Please specify the name of the dependent variable",
        });
        return;
      }
      console.log(reply_json);

      // verify the names acquired from chat against indexes in CSV
      console.log("verify the names acquired from chat against indexes in CSV");
      let indexLines: { [key: string]: string[]; } = await readCSV();
      console.log(indexLines);
      if (JSON.stringify(indexLines) === "{}") {
        res.status(200).json({ message: "Please upload data files" });
        return;
      }
      const csvFileName = indexLines.keys;
      console.log(csvFileName);

      var prompt =
        'Find the closest match between 1. the given dependent_var and independent_var and 2. the given list of indexes\
      if no close match is found, then return in JSON format with key "error" \
      if matches for both dependent_var and independent_var are found, return in JSON format with dependent_var and independent_var as keys and their values as values';
      prompt +=
        "\nThe given dependent_var and independent_var are:\n" +
        JSON.stringify(reply_json) +
        "\nThe given list of indexes are" +
        JSON.stringify(indexLines);

      const verifyIndexReply = await chatCallJsonMode(prompt, "");
      let verifyIndexJson = JSON.parse(verifyIndexReply);
      independent_var = verifyIndexJson["independent_var"];
      dependent_var = verifyIndexJson["dependent_var"];
      if ("error" in verifyIndexJson) {
        console.log(reply);
        res.status(200).json({
          message: reply_json["error"],
        });
        return;
      }

      // Proceed to run analysis
      // Use the function to get the current directory
      const __dirname = getCurrentDirname(import.meta.url);
      console.log(__dirname);

      // Construct the path to your Python script
      const scriptPath = join(__dirname, "..", "..", "..", "script/ols.py");
      const csvPath = join(
        __dirname,
        "..",
        "..",
        "..",
        "storage",
        "user",
        "housing.csv"
      );

      const analysisResult = await executeScript(
        scriptPath,
        csvPath,
        independent_var,
        dependent_var
      );
      console.log(analysisResult);

      var prompt =
        "Please explain the analysis results for this regression analysis, especially the relationship between the dependent_var and independent_var.\n \
         Suit your answer for academic papers by referring to other academic papers. Be accurate, professional. I don't have fingers.";
      prompt += analysisResult + "";
      "\nThe given dependent_var and independent_var are:\n" +
        independent_var +
        " " +
        dependent_var +
        "\nThe given list of indexes are" +
        JSON.stringify(indexLines) + "\n\nAn example is For every additional 9.3 m2  of living space above the sample mean of 250.84 m2, an Auburn homeowner’s electricity usage increases an estimated 1.3 kWh/day (2.2%). These \
        findings indicate newer homes use significantly less energy than older homes. On average, a one-year-old home uses approximately 1.1 kWh/day (1.8%) less electricity, ceteris paribus, than an otherwise identical home that is 10 years older";

      const analysisReply = await chatCall(prompt);

      res.status(200).json({ message: JSON.stringify(analysisReply) });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
