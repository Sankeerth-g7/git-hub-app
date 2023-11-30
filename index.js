import OpenAIApi from "openai";
import Configuration from 'openai';

async function getResponse(originalCode, addedCode) {
  const gptResponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    messages: [
      {
        role: "user",
        content: `explain the changes in the code ${originalCode} to ${addedCode}`,
      },
      {
        role: "system",
        content:
          "You are an expert code reviewer. You are reviewing a pull request.",
      },
    ],
  });
  return gptResponse;
}


var response = await getResponse('-function mul(a, b){\n-    return a * b;', '+function subtract(a, b){\n+    return a - b;')
console.log(response.choices[0].message.content)