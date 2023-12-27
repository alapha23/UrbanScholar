import axios from "axios";
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import {
  chatCall,
  chatCallJsonMode,
  chatCallWithContext,
  chatCallWithTool,
} from "@/utils/openai";

async function getMostRelevantArticleChunk(
  question: string
): Promise<string[]> {
  console.log("Trying to get the most relevant article chunk");
  let data = JSON.stringify({
    question: question,
    temperature: 0.5,
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: process.env.EMBEDDING_SERVER_URL + "/search",
    headers: {
      "Content-Type": "application/json",
    },
    data: data,
  };

  try {
    const response = await axios.request(config);
    const context = JSON.parse(JSON.stringify(response.data.context));
    return context;
  } catch (error) {
    console.log(error);
    return [""];
  }
}

// Usage example
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { message, conversationHistory } = req.body;
  const context = await getMostRelevantArticleChunk(message);
  context.push(conversationHistory);
  console.log("context", context);

  switch (req.method) {
    case "POST":
      chatCallWithContext(message, JSON.stringify(context))
        .then((response) => {
          console.log("GPT API response:", response);
          res.status(200).json({ message: response });
        })
        .catch((error) => {
          console.error("Error:", error);
          res.status(401).end("Request failed");
        });
      break;
    default:
      res.setHeader("Allow", ["POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
