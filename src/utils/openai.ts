import {
    OpenAI,
} from "openai";

const openai = new OpenAI({
    organization: process.env.OPENAI_ORG ? process.env.OPENAI_ORG : undefined,
    apiKey: process.env.OPENAI_KEY,
});

export async function chatCallJsonMode(prompt: string, context: string): Promise<string> {
    try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: "Always produce responses in JSON format" },
            { role: "system", content: context }
        ];
        messages.push({ role: "user", content: prompt });

        const response: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: messages,
            response_format: { type: "json_object" },
        });
        const responseText = response.choices[0].message?.content;

        return responseText as string;
    } catch (error) {
        console.log(error)
    }
    return '';
}

export async function chatCallWithTool(prompt: string, tools: any): Promise<string> {
    try {
        const runner = openai.beta.chat.completions
            .runFunctions({
                model: "gpt-4-1106-preview",
                messages: [{ role: 'user', content: prompt }],
                functions: tools,
            })
            .on('message', (message) => console.log(message));

        const finalContent = await runner.finalContent();
        console.log(finalContent);
        return finalContent as string;
    } catch (error) {
        console.log(error)
    }
    return '';
}

export async function chatCallWithContext(prompt: string, context: string): Promise<string> {
    try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: context }
        ];
        messages.push({ role: "user", content: prompt });

        const response: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: messages,
            //tools: tools
        });
        const responseText = response.choices[0].message?.content;

        return responseText as string;
    } catch (error) {
        console.log(error)
    }
    return '';
}

export async function chatCall(prompt: string): Promise<string> {
    try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: "" }
        ];
        messages.push({ role: "user", content: prompt });

        const response: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: messages,
            //tools: tools
        });
        const responseText = response.choices[0].message?.content;

        return responseText as string;
    } catch (error) {
        console.log(error)
    }
    return '';
}