import type { NextApiRequest, NextApiResponse } from 'next';
import { chatCall, chatCallJsonMode, chatCallWithTool } from '@/utils/openai';
import { readCSV } from '@/utils/helper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { message, conversationHistory } = req.body;
        console.log(conversationHistory);
        // verify input csv integrity

        // acquire independent variable
        var prompt = "Seek the independent variable in the prompt and the chat history included in the prompt, if there is no independent variable, then return in JSON format where there is a key called \"error\" \
        if there is the independent variable, then return in JSON format where independent_var is the key"
        prompt += "\nThe chat history is:\n" + JSON.stringify(conversationHistory);

        const reply = await chatCallJsonMode(prompt + message, "");
        console.log(reply);
        let reply_json = JSON.parse(reply);
        if (reply_json['independent_var'] == undefined) {
            res.status(200).json({ message: "Please specify the name of the independent variable" });
            return;
        }

        // verify the name of the independent variable
        let indexLines: { [key: string]: string[] } = await readCSV();


        // acquire dependent variable

        res.status(200).json({ reply });
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
