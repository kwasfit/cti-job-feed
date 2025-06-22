// generate-feed.js
const fs = require("fs");
const Parser = require("rss-parser"); // optional if reading existing feeds
const { google } = require("googleapis");
const path = require("path");

const credentials = require("./cti-job-feed-3b4b4d4a2449.json");
const SHEET_ID = "1bGVtT0qXmSnZZaspRUjyHskh_PAqC0H_QRhgnpAHyKY"; // Replace with your actual sheet ID

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

function createRSS(jobs) {
  const items = jobs.map(job => `
    <item>
      <title>${job.title}</title>
      <link>${job.link}</link>
      <description>${job.company}</description>
    </item>
  `).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
      <title>Cyber Threat Intelligence Jobs</title>
      <link>https://ctijen.com/cti-jobs</link>
      <description>Latest CTI job listings scraped by CTI Jen</description>
      <language>en-us</language>
      ${items}
    </channel>
  </rss>`;

  return rss;
}

async function getJobsFromSheet() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A2:C",
  });
  const rows = res.data.values || [];

  return rows.map(([title, company, link]) => ({ title, company, link }));
}

(async () => {
  try {
    const jobs = await getJobsFromSheet();
    const rss = createRSS(jobs);
    fs.writeFileSync(path.join(__dirname, "feed.xml"), rss);
    console.log("✅ RSS feed written to feed.xml");
  } catch (err) {
    console.error("❌ Failed to generate feed:", err);
  }
})();
