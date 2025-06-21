const { google } = require("googleapis");
const fs = require("fs");

const credentials = JSON.parse(fs.readFileSync("/Users/jen-forregularuse/cti-job-scraper/cti-job-feed-3b4b4d4a2449.json", "utf8"));

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"], // or 'spreadsheets' if you're writing
});

async function testAuth() {
  try {
    await auth.authorize();
    console.log("✅ Auth successful!");
  } catch (err) {
    console.error("❌ Auth failed:", err.message);
    console.error(err);
  }
}

testAuth();
