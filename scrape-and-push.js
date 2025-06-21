// scrape-and-push.js
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { google } = require("googleapis");
const fs = require("fs");

puppeteer.use(StealthPlugin());

// Load your service account credentials JSON file path here
const credentials = JSON.parse(fs.readFileSync("/Users/jen-forregularuse/cti-job-scraper/cti-job-feed-3b4b4d4a2449.json"));

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});


const sheets = google.sheets({ version: "v4", auth });

const SHEET_ID = "1bGVtT0qXmSnZZaspRUjyHskh_PAqC0H_QRhgnpAHyKY";


const KEYWORDS = [
  "threat", "intel", "intelligence", "cti",
  "cyber", "security researcher"
];

function matchesKeywords(text) {
  return KEYWORDS.some(k => text.toLowerCase().includes(k));
}

async function scrapeRemoteOK(page) {
  await page.goto("https://remoteok.com/remote-cybersecurity-jobs", { waitUntil: "networkidle2" });
  await page.waitForSelector("tr.job", { timeout: 15000 });

  return page.evaluate(() => {
    return Array.from(document.querySelectorAll("tr.job")).map(row => ({
      title: row.querySelector("h2")?.innerText.trim() || "",
      company: row.querySelector(".companyLink")?.innerText.trim() || "",
      link: row.querySelector("a.preventLink")?.href || ""
    }));
  });
}

async function scrapeCyberSecurityJobSite(page) {
  await page.goto("https://www.cybersecurityjobsite.com/jobs/cyber-threat-intelligence", { waitUntil: "networkidle2" });
  await page.waitForSelector(".lister__header", { timeout: 15000 });

  return page.evaluate(() => {
    return Array.from(document.querySelectorAll(".lister__header")).map(card => {
      const titleElem = card.querySelector("a");
      const title = titleElem?.innerText.trim() || "";
      const link = titleElem?.href || "";
      const company = card.nextElementSibling?.querySelector(".lister__meta")?.innerText.trim() || "";
      return { title, company, link };
    });
  });
}

async function getExistingLinks(spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!C2:C", // Column C = job links
  });
  return new Set(res.data.values?.flat() || []);
}

async function appendJobsToSheet(spreadsheetId, jobs) {
  const values = jobs.map(job => [job.title, job.company, job.link]);

  const resource = {
    values,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:C", // Adjust if your sheet has a different name or range
    valueInputOption: "RAW",
    resource,
  });
}

async function ensureHeaders(spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A1:C1",
  });

  const firstRow = res.data.values?.[0];
  if (!firstRow || firstRow[0] !== "Title") {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1:C1",
      valueInputOption: "RAW",
      resource: {
        values: [["Title", "Company", "Link"]],
      },
    });
    console.log("📝 Headers written.");
  } else {
    console.log("✅ Headers already present.");
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    slowMo: 100,
    defaultViewport: null,
    args: ["--start-maximized"]
  });
  const page = await browser.newPage();

  console.log("🔍 Scraping RemoteOK...");
  const remoteOKJobs = await scrapeRemoteOK(page);

  console.log("🔍 Scraping CyberSecurityJobSite...");
  const csjsJobs = await scrapeCyberSecurityJobSite(page);

  await browser.close();

  const allJobs = [...remoteOKJobs, ...csjsJobs];
  const filteredJobs = allJobs.filter(job => matchesKeywords(job.title));

  await ensureHeaders(SHEET_ID);
  const existingLinks = await getExistingLinks(SHEET_ID);
  const newJobs = filteredJobs.filter(job => !existingLinks.has(job.link));

if (newJobs.length > 0) {
  await appendJobsToSheet(SHEET_ID, newJobs);
  console.log(`✨ Added ${newJobs.length} new job(s)!`);
} else {
  console.log("📭 No new jobs to add.");
}

console.log(`🎯 Found ${filteredJobs.length} CTI jobs. Pushing to Google Sheet...`);
console.log("✅ Done!");
}

main().catch(console.error);
