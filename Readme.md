# GitHub App for PRs with Explain and Execute Features

## Overview

Welcome to the GitHub App repository created as part of a screening test for codemate.ai. This app is designed for handling Pull Requests (PRs) with special features: "Explain" and "Execute." The "Explain" feature allows users to trigger an explanation process by including "/explain" in the commit message, and the app sends the changed code of that commit to the OpenAI language model (LLM) known as Davinci. Additionally, the "Execute" feature allows users to execute selected code changes in a PR comment using the Piston API.

## Features

- **Explain Command:**
  - If a commit message in a PR contains "/explain," the app initiates an explanation process.
  - The changed code from that specific commit is sent to the Davinci language model.


- **Execute Command:**
  - If a comment on a PR contains "/execute," the app executes the selected code changes using the Piston API.
  - The app executes the code and returns the output of the code execution as a comment on the PR.
  - Supported languages: Python, JavaScript, Java, C, C++, C#, Go, Ruby, Rust, PHP, and Many More.

## Getting Started

To get started with the GitHub App and leverage the Explain and Execute features, follow these steps:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Sankeerth-g7/git-hub-app.git
    ```
2. **Install Dependencies:**
    ```bash
    npm install
    ```
3. **Run the App:**
    ```bash
    npm start
    ```
4. **Install the App on GitHub:**
    - Navigate to the [GitHub App]("https://github.com/apps/myappmate")
    - Click on the "Configure" button
    - Select the repository you want to install the app on
    - Click on the "Install" button

## Usage

### Explain Feature

To use the Explain feature, follow these steps:

1. **Create a PR:**
   - Create a new branch from the main branch
   - Make some changes to the code
   - Commit the changes with a commit message that contains "/explain"
   - Push the changes to the remote repository
   - Create a PR from the new branch to the main branch

2. **Check the PR:**
    - Navigate to the PR
    - Check the "Checks" tab
    - Click on the "Details" button next to the "Explain" check
    - Check the "Summary" section to see the explanation results

### Execute Feature

To use the Execute feature, follow these steps:

1. **Create a PR:**
   - Create a new branch from the main branch
   - Make some changes to the code
   - Commit the changes
   - Push the changes to the remote repository
   - Create a PR from the new branch to the main branch

2. **Add a Comment:**
    - Navigate to the PR
    - Add a comment to the PR with the code you want to execute
    - The comment should contain "/execute stdin 1 2 if the code requires input from the user or "/execute args 1 2 if the code requires command-line arguments"
    - The app will execute the code and return the output as a comment on the PR

## Future Work

- **Explain Feature:**
  - THe app currently uses the Davinci language model for the explanation process. However, the app can be extended to support other language models such as Codex and Curie.
  - The LLM can be fine-tuned to improve the quality of the explanation results.
  - The results can be improved by using a better pre-processing technique for the code.
