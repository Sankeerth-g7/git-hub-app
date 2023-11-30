import executeCode from "./piston.js";
import OpenAI from "openai";

export const languageMap = {
  js: ["javascript", "18.15.0"],
  py: ["python", "3.10.0"],
  rb: ["ruby", "3.0.1"],
  java: ["java", "15.0.2"],
  c: ["c", "10.2.0"],
  cpp: ["c++", "10.2.0"],
  rs: ["rust", "1.68.2"],
  go: ["go", "1.16.2"],
  php: ["php", "8.2.3"],
};

export async function checkNeedsExecution(payload) {
  if (pattern.test(payload.comment.body)) {
    return true;
  } else {
    return false;
  }
}

export async function extractArgsAndStdin(payload) {
  const pattern_stdin = /\/execute\sstdin(\s+\d+)+/gm;
  const pattern_args = /\/execute(\s+\d+)+/gm;
  var args = [];
  var stdin = "";
  if (pattern_stdin.test(payload.comment.body)) {
    stdin = payload.comment.body
      .match(pattern_stdin)[0]
      .split(" ")
      .splice(2)
      .join(" ");
  } else if (pattern_args.test(payload.comment.body)) {
    args = payload.comment.body.match(pattern_args)[0].split(" ").splice(1);
  }
  return [args, stdin];
}

export async function generateCommentBody(payload, code) {
  var [language, version] = languageMap[payload.comment.path.split(".").pop()];
  const [args, stdin] = await extractArgsAndStdin(payload);
  var output = await executeCode(code, language, version, args, stdin);
  return `Output of the code is: \n ${output}`;
}

export async function getFileContents({ octokit, payload }) {
  try {
    var start_line = payload.comment.start_line;
    var end_line = payload.comment.line;
    const output = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}?ref={commit_id}",
      {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        path: payload.comment.path,
        commit_id: payload.comment.commit_id,
        headers: {
          "x-github-api-version": "2022-11-28",
        },
      }
    );
    var code = Buffer.from(output.data.content, "base64").toString("utf-8");
    code = code
      .split("\n")
      .splice(start_line - 1, end_line - start_line + 1)
      .join("\n");
    return code;
  } catch (error) {
    if (error.response) {
      console.error(
        `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`
      );
    }
    console.error(error);
  }
}

let getCommitCode = async function ({octokit, payload, commitSha}) {
  const commit = await octokit.request(
    "GET /repos/{owner}/{repo}/commits/{commit_sha}",
    {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      commit_sha: commitSha,
      headers: {
        "x-github-api-version": "2022-11-28",
      },
    }
  );

  let changes = commit.data.files[0].patch;
  changes = changes.split("\n").slice(1).join("\n");
  // add all lines having - in the start to original code and + to added code
  let originalCode = changes
    .split("\n")
    .filter((line) => line.startsWith("-"))
    .join("\n");
  let addedCode = changes
    .split("\n")
    .filter((line) => line.startsWith("+"))
    .join("\n");
  return [originalCode, addedCode];
};

let getCommitExplaination = async function (originalCode, addedCode) {
  const openai = new OpenAI(process.env.OPENAI_API_KEY);

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
  let explaination = await getResponse(originalCode, addedCode);
  return [explaination.choices[0].message.content, explaination.choices[0].finish_reason];
};

let getCommitMessage = async function ({octokit, payload}) {
  const commits = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
    {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: payload.pull_request.number,
      headers: {
        "x-github-api-version": "2022-11-28",
      },
    }
  );

  let commitMessages = [];
  commits.data.forEach((commit) => {
    commitMessages.push([commit.commit.message, commit.sha]);
  });
  return commitMessages;
};

export let getCommitCodeAndExplanation = async function ({octokit, payload}) {
  let commitMessage = await getCommitMessage({octokit, payload});
  let payloads = [];
  for (let i = 0; i < commitMessage.length; i++) {
    if (commitMessage[i][0].includes("/explain")) {
      var commitSha = commitMessage[i][1];
      let changes = await getCommitCode({octokit, payload, commitSha});
      console.log(changes)
      let originalCode = changes[0].slice(1, -2);
      let addedCode = changes[1].slice(2, -2);
      if (addedCode === "") {
        addedCode = originalCode;
        originalCode = "There is no code in the original file";
      }

      let explaination = await getCommitExplaination(originalCode, addedCode);

      let comment = `Found /explain in ${commitMessage[i][1]}\n
      Explanation for the changes are: \n${explaination[0]}`;

      payloads.push({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.pull_request.number,
        body: comment,
        headers: {
          "x-github-api-version": "2022-11-28",
        },
      });
    }
  }
  return payloads;
};
