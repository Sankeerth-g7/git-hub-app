// These are the dependencies for this file.
//
// You installed the `dotenv` and `octokit` modules earlier. The `@octokit/webhooks` is a dependency of the `octokit` module, so you don't need to install it separately. The `fs` and `http` dependencies are built-in Node.js modules.
import dotenv from "dotenv";
import {App} from "octokit";
import {createNodeMiddleware} from "@octokit/webhooks";
import fs from "fs";
import http, { get } from "http";
import OpenAI from "openai";

// This reads your `.env` file and adds the variables from that file to the `process.env` object in Node.js.
dotenv.config();

// This assigns the values of your environment variables to local variables.
const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

// This reads the contents of your private key file.
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

// This creates a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret
  },
});

// This defines the message that your app will post to pull requests.
const messageForNewPRs = "Thanks for opening a new PR! Please follow our contributing guidelines to make your PR easier to review.";

// This adds an event handler that your code will call later. When this event handler is called, it will log the event to the console. Then, it will use GitHub's REST API to add a comment to the pull request that triggered the event.
async function handlePullRequestOpened({octokit, payload}) {

  let getCommitCode = async function (commitSha) {
    // this gets the commit for the PR
    const commit = await octokit.request("GET /repos/{owner}/{repo}/commits/{commit_sha}", {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      commit_sha: commitSha,
      headers: {
        "x-github-api-version": "2022-11-28",
      },
    });

    // this gets the code from the commit and returns it

    let changes = commit.data.files[0].patch;
    changes = changes.split("\n").slice(1).join("\n");
    let originalCode = changes.split("No newline at end of file")[0];
    let addedCode = changes.split("No newline at end of file")[1];
    return [originalCode, addedCode];
  }

  let getCommitExplaination = async function (originalCode, addedCode) {

    const openai = new OpenAI(process.env.OPENAI_API_KEY);

    async function getResponse() {
      const gptResponse = await openai.completions.create({
        model: 'davinci',
        prompt: `Write the expalnation for changed code. The original code is: ${originalCode} \n The  is: \n changed code is: ${addedCode} `,
        temperature: 0.3,
        n: 1,
        stream: false,
      });
      return gptResponse;
    }
    let explaination = await getResponse();
    let finish_reason = explaination["choices"][0]["finish_reason"];
    explaination = explaination["choices"][0]["text"].split("\n").slice(1).join('');
    return [explaination, finish_reason];
  }

  let getCommitMessage = async function (payload) {
    // this gets the commits for the PR
    const commits = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/commits", {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: payload.pull_request.number,
      headers: {
        "x-github-api-version": "2022-11-28",
      },
    });

    // this gets commit message from all commits of a PR and returns the list of commit messages and commit sha

    let commitMessages = [];
    commits.data.forEach((commit) => {
      commitMessages.push([commit.commit.message, commit.sha]);
    });
    return commitMessages;
  }

  let commitMessage = await getCommitMessage(payload);
  
  for(let i = 0; i < commitMessage.length; i++) {
    if(commitMessage[i][0].includes("/explain")) {
      console.log("found explain");
      let changes = await getCommitCode(commitMessage[i][1]);
      let originalCode = changes[0].slice(1, -2);
      let addedCode = changes[1].slice(2, -2);
      if (addedCode === "") {
        addedCode = originalCode;
        originalCode = "There is no code in the original file";
      }

      let explaination = await getCommitExplaination(originalCode, addedCode);
      
      let comment = `Found /explain in ${commitMessage[i][1]}  
      The changes made in the commit are:
      
      From : ${originalCode} 
      To: ${addedCode}
      Explanation for the changes are: ${explaination[0]}
      Stop reason: ${explaination[1]} exceeded`;

      try {
        await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          issue_number: payload.pull_request.number,
          body: comment,
          headers: {
            "x-github-api-version": "2022-11-28",
          },
        },
        );
      } catch (error) {
        if (error.response) {
          console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
        }
        console.error(error)
      }
    }
  }

  try {
    await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.pull_request.number,
      body: messageForNewPRs,
      headers: {
        "x-github-api-version": "2022-11-28",
      },
    },
    );
  } catch (error) {
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
    }
    console.error(error)
  }
};

// This sets up a webhook event listener. When your app receives a webhook event from GitHub with a `X-GitHub-Event` header value of `pull_request` and an `action` payload value of `opened`, it calls the `handlePullRequestOpened` event handler that is defined above.
app.webhooks.on("pull_request.opened", handlePullRequestOpened);

// This logs any errors that occur.
app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing request: ${error.event}`);
  } else {
    console.error(error); 
  }
});

// This determines where your server will listen.
//
// For local development, your server will listen to port 3000 on `localhost`. When you deploy your app, you will change these values. For more information, see "[Deploy your app](#deploy-your-app)."
const port = 3000;
const host = 'localhost';
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;

// This sets up a middleware function to handle incoming webhook events.
//
// Octokit's `createNodeMiddleware` function takes care of generating this middleware function for you. The resulting middleware function will:
//
//    - Check the signature of the incoming webhook event to make sure that it matches your webhook secret. This verifies that the incoming webhook event is a valid GitHub event.
//    - Parse the webhook event payload and identify the type of event.
//    - Trigger the corresponding webhook event handler.
const middleware = createNodeMiddleware(app.webhooks, {path});

// This creates a Node.js server that listens for incoming HTTP requests (including webhook payloads from GitHub) on the specified port. When the server receives a request, it executes the `middleware` function that you defined earlier. Once the server is running, it logs messages to the console to indicate that it is listening.
http.createServer(middleware).listen(port, () => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`);
  console.log('Press Ctrl + C to quit.')
});