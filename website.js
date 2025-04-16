const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const fs = require("fs");
const dns = require("dns");

const WEBSITES = [
    "https://google.com",
    "https://example.com",
    "https://facebook.com"
];

const TIMEOUT = 30000; // 30 seconds
const LOG_FILE = "/home/nitaant/website_running/website_status.log";

// Email credentials
const EMAIL_USER = "vyosim.nitant.d@gmail.com";
const EMAIL_PASS = "rgke gsrw kfyh inve";
const NOTIFY_EMAIL = "vyosim.nitant.d@gmail.com";

function getReadableTimestamp() {
    return new Date().toLocaleString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
    });
}

function checkInternetConnection() {
    return new Promise((resolve) => {
        dns.resolve("google.com", (err) => {
            resolve(!err);
        });
    });
}

async function sendEmailReport(report, readableTime) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: EMAIL_USER,
        to: NOTIFY_EMAIL,
        subject: `🌐 Website/Internet Status Notification - ${readableTime}`,
        text: report,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent at ${readableTime}`);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
}

function logStatus(message) {
    const logEntry = `[${getReadableTimestamp()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
}

async function checkWebsites() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: puppeteer.executablePath(),
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    const readableTime = getReadableTimestamp();
    let report = `🌐 Website Status Report - ${readableTime}\n\n`;

    for (const url of WEBSITES) {
        let status = "UP";
        try {
            await page.goto(url, { waitUntil: "networkidle2", timeout: TIMEOUT });
            console.log(`✅ ${url} is UP`);
            report += `✅ ${url} is UP\n`;
        } catch (error) {
            console.error(`❌ ${url} is DOWN`);
            status = "DOWN";
            report += `❌ ${url} is DOWN - Error: ${error.message}\n`;
        }
        logStatus(`${status} - ${url}`);
    }

    await browser.close();
    await sendEmailReport(report, readableTime);
}

async function main() {
    console.log("🔄 Checking websites...");
    const isConnected = await checkInternetConnection();

    if (!isConnected) {
        const timeDown = getReadableTimestamp();
        console.error("❌ No internet connection.");
        logStatus("❌ Internet connection LOST");
        
        // Wait and retry every 1 minute until internet is back
        const retryInterval = setInterval(async () => {
            const isBack = await checkInternetConnection();
            if (isBack) {
                clearInterval(retryInterval);
                const timeBack = getReadableTimestamp();
                const report = `🔌 Internet was lost at: ${timeDown}\n✅ Internet restored at: ${timeBack}`;
                logStatus("✅ Internet connection RESTORED");
                await sendEmailReport(report, timeBack);
                await checkWebsites(); // Continue normal task
            }
        }, 60000); // 60 seconds
    } else {
        await checkWebsites();
    }
}

main();
