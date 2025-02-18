import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createRouter } from "./context";

import { readCSV, Message } from "@/utils/helper";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import axios from "axios";
import {
  chatCall,
  chatCallJsonMode,
  chatCallWithContext,
} from "@/utils/openai";
import { matchKeywords, sizeDownConversationHistory } from "@/utils/helper";
import { Chat, PrismaClient } from "@prisma/client";

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

async function updateContentDB(
  prisma: PrismaClient,
  chatId: string,
  conversationHistory: any[],
  message: string
): Promise<Chat> {
  conversationHistory.push({
    sender: "UrbanGPT",
    text: message,
  });

  const updatedContent = JSON.stringify(conversationHistory);
  const updatedChat = await prisma.chat.update({
    where: {
      id: chatId,
    },
    data: {
      content: updatedContent,
      updatedAt: new Date(),
    },
  });
  return updatedChat;
}

async function validateConversation(
  prisma: PrismaClient,
  chatId: string,
  conversationHistory: Array<{ sender: string; text: string }>,
  message: string
) {
  console.log("validate conversation of chatid", chatId);
  // In case the conversation has been updated in the DB through another browser
  const chat = await prisma.chat.findUnique({
    where: {
      id: chatId,
    },
    select: {
      content: true,
    },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  // Parse the content from the database
  let currentDbContent;
  try {
    currentDbContent = JSON.parse(chat.content);
  } catch (error) {
    console.error("Error parsing JSON from DB:", error);
    throw new Error("Failed to parse chat content from the database");
  }

  // Compare the conversation history with DB content
  let clientHistoryWithoutLastMessage = conversationHistory.slice(0, -1);
  if (currentDbContent.length !== clientHistoryWithoutLastMessage.length) {
    return false;
  }
  // Add new message to DB
  await updateContentDB(
    prisma,
    chatId,
    clientHistoryWithoutLastMessage,
    message
  );

  return true;
}

async function getMostRelevantArticleChunk(
  question: string,
  url: string
): Promise<string[]> {
  console.log("Trying to get the most relevant article chunk");
  let data = JSON.stringify({
    question: question,
    temperature: 0.5,
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: url,
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

export const chatRouter = createRouter()
  .middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next();
  })
  .mutation("create", {
    input: z.object({
      userId: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      // Create a new chat entry
      const chat = await prisma.chat.create({
        data: {
          userId: input.userId,
          title: "New Chat",
          content: "[]",
        },
        select: {
          id: true,
          title: true,
          content: true,
        },
      });
      return chat.id;
    },
  })
  .mutation("analysis", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      const { message, originalConversationHistory, chatId } = JSON.parse(
        input.data
      );
      let indexLines = await readCSV();
      //console.log(indexLines);

      // 1. Verify DB see if conversation is updated
      // Add first user message to DB
      let validateResult = await validateConversation(
        prisma,
        chatId,
        originalConversationHistory,
        message
      );

      if (validateResult === false) {
        return {
          reply:
            "The conversation history has been updated. Please refresh the page",
        };
      }

      // limit the size of the conversation history that we use to fit the context window
      const conversationHistory: Array<{ sender: string; text: string }> =
        await sizeDownConversationHistory(originalConversationHistory);

      // 2. verify input csv integrity
      if (JSON.stringify(indexLines) === "{}") {
        let reply = "Please upload data files";
        await updateContentDB(
          prisma,
          chatId,
          originalConversationHistory,
          reply
        );

        return { reply: reply };
      }

      // 3. is the user asking for all indexes?
      var prompt =
        'Is the user asking for all indexes or variables? Key of Json is "answer", value is "Yes" or "No"\
             Allow fuzzy spelling';
      prompt += "\nUser:" + message;

      var reply = await chatCallJsonMode(prompt, "");
      let reply_json = JSON.parse(reply);

      if (reply_json["answer"] === "Yes") {
        let reply =
          "Existing indexes:" +
          JSON.stringify(indexLines) +
          " To proceed with linear regression analysis,\
          please inform me the independent variables and dependent variables\n";

        await updateContentDB(
          prisma,
          chatId,
          originalConversationHistory,
          reply
        );
        return { reply: reply };
      }

      // 4. acquire independent variable
      var independent_var;
      var dependent_var;
      prompt =
        'Seek the independent variables chosen by the user. If none is chosen, then return in JSON format where there is a key called "error" \
            if one or more is chosen, return in JSON format where independent_var is the key. \
            If there are multiple independent variables, then the values will be a string array of the chosen dependent variables.\
             Allow fuzzy spelling';
      prompt +=
        "\nThe chat history is:\n" + JSON.stringify(conversationHistory);

      reply = await chatCallJsonMode(prompt + message, "");
      reply_json = JSON.parse(reply);
      console.log(reply_json);
      if ("error" in reply_json) {
        let reply = reply_json["error"];

        await updateContentDB(
          prisma,
          chatId,
          originalConversationHistory,
          reply
        );
        return { reply: reply };
      }

      // 5. verify the name of the independent variable
      if (reply_json["independent_var"] === undefined) {
        let reply = "Please specify the name of the independent variable";

        await updateContentDB(
          prisma,
          chatId,
          originalConversationHistory,
          reply
        );
        return { reply: reply };
      }
      independent_var = reply_json["independent_var"];

      // 6. acquire dependent variable
      prompt =
        'Seek the dependent variable chosen by the user. None is chosen, then return in JSON format where there is a key called "error" \
            if one dependent variable is chosen, return in JSON format where dependent_var is the key, while the string of the chosen dependent_var is the value\
             Allow fuzzy spelling';
      prompt +=
        "\nThe chat history is:\n" + JSON.stringify(conversationHistory);

      reply = await chatCallJsonMode(prompt + message, "");
      reply_json = JSON.parse(reply);

      if (reply_json["dependent_var"] === undefined) {
        let reply = "Please specify the name of the dependent variable";

        await updateContentDB(
          prisma,
          chatId,
          originalConversationHistory,
          reply
        );
        return { reply: reply };
      }
      dependent_var = reply_json["dependent_var"];
      console.log(reply_json);

      // 7. verify the names acquired from chat against indexes in CSV
      console.log("verify the names acquired from chat against indexes in CSV");
      const csvFileNames = Object.keys(indexLines);
      console.log(csvFileNames);
      console.log(indexLines);

      var prompt =
        'Find the closest match between 1. the given dependent_var and independent_var and 2. the given list of indexes\
          if no close match is found, then return in JSON format with key "error" \
          if matches for both dependent_var and independent_var are found, return in JSON format with dependent_var and independent_var as keys and their values as values\
          if the values of independent_var is an array, keep the array as the JSON value';
      prompt +=
        "\nThe given dependent_var and independent_var are:\n" +
        "dependent_var:" +
        dependent_var +
        ", independent_var:" +
        independent_var +
        "\nThe given list of indexes are" +
        JSON.stringify(indexLines);

      const verifyIndexReply = await chatCallJsonMode(prompt, "");
      let verifyIndexJson = JSON.parse(verifyIndexReply);
      console.log(verifyIndexJson);
      independent_var = verifyIndexJson["independent_var"];
      dependent_var = verifyIndexJson["dependent_var"];
      if ("error" in Object.keys(verifyIndexJson)) {
        let reply = reply_json["error"];

        await updateContentDB(
          prisma,
          chatId,
          originalConversationHistory,
          reply
        );
        return { reply: reply };
      }

      // 8. Proceed to run analysis
      // Use the function to get the current directory
      const __dirname = getCurrentDirname(import.meta.url);
      console.log(__dirname);

      // Construct the path to your Python script
      let scriptPath;
      let formattedIndependentVar;

      if (Array.isArray(independent_var)) {
        scriptPath = join(__dirname, "..", "..", "..", "script/ols_mul.py");
        formattedIndependentVar = independent_var.join(",");
      } else {
        scriptPath = join(__dirname, "..", "..", "..", "script/ols.py");
        formattedIndependentVar = independent_var;
      }

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
        formattedIndependentVar,
        dependent_var
      );
      console.log(analysisResult);

      var prompt =
        "Please explain the analysis results for this regression analysis, especially the relationship between the dependent_var and independent_var \
            using R-squared, adjusted R-squared, Coefficients, standard error, Diagnostic Tests. \
            Focus on coefficients.\
            Relate your answer to past academic papers by inferring from given index names. Be accurate, professional. I don't have fingers.";
      prompt += analysisResult + "";
      "\nThe given dependent_var and independent_var are:\n" +
        independent_var +
        " " +
        dependent_var +
        "\nThe given list of indexes are" +
        JSON.stringify(indexLines) +
        "\n\nAn example is For every additional 9.3 m2  of living space above the sample mean of 250.84 m2, an Auburn homeowner’s electricity usage increases an estimated 1.3 kWh/day (2.2%). These \
            findings indicate newer homes use significantly less energy than older homes. On average, a one-year-old home uses approximately 1.1 kWh/day (1.8%) less electricity, ceteris paribus, than an otherwise identical home that is 10 years older \
            ";

      const analysisReply = await chatCall(prompt);

      // 9. save analysis to DB
      await updateContentDB(
        prisma,
        chatId,
        originalConversationHistory,
        analysisReply
      );

      console.log(analysisReply);
      return { table: analysisResult, reply: analysisReply };
    },
  })
  .mutation("qna", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      const { message, originalConversationHistory, chatId } = JSON.parse(
        input.data
      );

      // Verify DB see if conversation is updated
      // Add first user message to DB
      let validateResult = await validateConversation(
        prisma,
        chatId,
        originalConversationHistory,
        message
      );

      if (validateResult === false) {
        return {
          reply:
            "The conversation history has been updated. Please refresh the page",
        };
      }

      // limit the size of the conversation history that we use to fit the context window
      const conversationHistory: Array<{ sender: string; text: string }> =
        await sizeDownConversationHistory(originalConversationHistory);

      // match keywowrds.json
      var keywords;
      if (process.env.KEYWORDS) {
        keywords = await matchKeywords(process.env.KEYWORDS, message);
        console.log("matched keywords", keywords);
      }

      const context = await getMostRelevantArticleChunk(
        message + JSON.stringify(keywords),
        process.env.EMBEDDING_SERVER_URL + "/search"
      );
      // deep copy
      const contexts = JSON.parse(JSON.stringify(context));

      contexts.push(JSON.stringify(conversationHistory));
      console.log("contexts", contexts);
      const response = await chatCallWithContext(
        message,
        JSON.stringify(contexts)
      );
      let replyMessage = response + "\n\n**References**\n\n\n";

      // Create a set to store unique references
      const uniqueReferences = new Set<string>();

      // Add each reference to the set, ensuring uniqueness
      for (const c of context) {
        const reference: string = c
          .replace(/U\.S\./g, "US")
          .split(".")[0] as string;
        console.log("add ref", reference);
        uniqueReferences.add(reference);
      }

      // Iterate over the set to build replyMessage
      uniqueReferences.forEach((reference) => {
        replyMessage += reference + "\n\n";
      });

      await updateContentDB(
        prisma,
        chatId,
        originalConversationHistory,
        replyMessage
      );
      return { reply: replyMessage };
    },
  })
  .mutation("report", {
    input: z.object({
      data: z.string(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      const { message, originalConversationHistory, chatId } = JSON.parse(
        input.data
      );

      // Verify DB see if conversation is updated
      // Add first user message to DB
      let validateResult = await validateConversation(
        prisma,
        chatId,
        originalConversationHistory,
        message
      );

      if (validateResult === false) {
        return {
          reply:
            "The conversation history has been updated. Please refresh the page",
        };
      }

      // limit the size of the conversation history that we use to fit the context window
      const conversationHistory: Array<{ sender: string; text: string }> =
        await sizeDownConversationHistory(originalConversationHistory);

      const context = await getMostRelevantArticleChunk(
        message + conversationHistory,
        process.env.REPORT_SERVER_URL + "/search"
      );
      context.push(JSON.stringify(conversationHistory));
      console.log("context", context);
      const prompt =
        "Genenerate a report for potential policy makers, mimic formats used in urban planning policy documents\
      Use academic and accurate langauge, and refer to evidences included in the context if necessary\
      Perfect your answer of each section of the policy document you write. \
      Send the answers section by section. I expect multipart answers in the following messages\n\n";
      const response = await chatCallWithContext(
        prompt + message,
        JSON.stringify(context)
      );

      await updateContentDB(
        prisma,
        chatId,
        originalConversationHistory,
        response
      );
      return { reply: response };
    },
  })
  .mutation("fetch", {
    input: z.object({
      userId: z.string(),
      skip: z.number(),
    }),
    resolve: async ({ ctx: { prisma }, input }) => {
      // query 10 chats from index increment
      const chats = await prisma.chat.findMany({
        where: {
          userId: input.userId,
        },
        skip: input.skip,
        take: 10,
        select: {
          id: true,
          title: true,
        },
      });
      //console.log(chats);

      return chats;
    },
  });
