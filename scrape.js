// scrape.js
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

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

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
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

  console.log(`🎯 Found ${filteredJobs.length} job(s) matching CTI keywords:`);
  console.table(filteredJobs);
}

main();
