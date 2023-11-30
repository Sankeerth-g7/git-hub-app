import axios from "axios";

async function executeCode(code, language, version, args, stdin) {
  const pistonApiUrl = "https://emkc.org/api/v2/piston/execute";

  const payload = {
    language: language,
    files: [
      {
        name: "index.js",
        content:
          code,
      },
    ],
    version: version,
    args: args || [],
    stdin: stdin || "",
  };

  try {
    const response = await axios.post(pistonApiUrl, payload);
    if (response.status === 200) {
      const output = response.data.run.stdout || "No output";
      return output;
    } else {
      console.error(`Error: ${response.status} - ${response.data.message}`);
      return `Error: ${response.status} - ${response.data.message}`;
    }
  } catch (error) {
    console.error("Request error:", error.message);
    return;
  }
}

export default executeCode;
