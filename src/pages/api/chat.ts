import type { NextApiRequest, NextApiResponse } from "next";
import { chatCall, chatCallJsonMode, chatCallWithTool } from "@/utils/openai";
import { readCSV } from "@/utils/helper";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { message, conversationHistory } = req.body;
    console.log(conversationHistory);
    // verify input csv integrity

    // acquire independent variable
    var prompt =
      'Seek the independent variable and the depedent variable. If there is either, then return in JSON format where there is a key called "error" \
        if there are both, return in JSON format where independent_var, dependent_var are the keys. Allow fuzzy spelling';
    prompt += "\nThe chat history is:\n" + JSON.stringify(conversationHistory);

    const reply = await chatCallJsonMode(prompt + message, "");
    let reply_json = JSON.parse(reply);
    if ("error" in reply_json) {
      console.log(reply);
      res.status(200).json({
        message: reply_json["error"],
      });
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
      res
        .status(200)
        .json({ message: "Please specify the name of the dependent variable" });
      return;
    }
    console.log(reply_json);

    // verify the names acquired from chat against indexes in CSV
    console.log("verify the names acquired from chat against indexes in CSV");
    let indexLines: { [key: string]: string[] } = await readCSV();
    console.log(indexLines);
    if (JSON.stringify(indexLines) === "{}") {
      res.status(200).json({ message: "Please upload data files" });
      return;
    }

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

    res.status(200).json({ message: JSON.stringify(verifyIndexJson) });
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
