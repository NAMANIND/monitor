// Required dependencies
const axios = require("axios");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Store previous comments to detect changes
let previousComments = new Set();

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  port: 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // Use App Password for Gmail
  },
});

// Function to scrape comments
async function scrapeComments(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Replace these selectors with the actual selectors from your target website
    const comments = [];
    $(".NV6quc").each((i, element) => {
      const comment = {
        id: $(element).find(".LfYwpe").text().trim(),
        author: $(element).find(".LfYwpe").text().trim(),
        content: $(element).find(".fzDEpf").text().trim(),
        timestamp: $(element).find(".ydlbEf").text().trim(),
      };
      comments.push(comment);
    });

    return comments;
  } catch (error) {
    console.error("Error scraping comments:", error);
    return [];
  }
}

// Function to send email notification
async function sendNotification(newComment) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFICATION_EMAIL,
    subject: "New Comment Detected",
    html: `
      <h2>New Comment Posted</h2>
      <p><strong>Author:</strong> ${newComment.author}</p>
      <p><strong>Content:</strong> ${newComment.content}</p>
      <p><strong>Posted at:</strong> ${newComment.timestamp}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Notification email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Main monitoring function
async function monitorComments(url) {
  try {
    const currentComments = await scrapeComments(url);

    // Check for new comments
    currentComments.forEach((comment) => {
      const commentKey = `${comment.id}-${comment.timestamp}`;
      if (!previousComments.has(commentKey)) {
        // New comment detected
        sendNotification(comment);
        previousComments.add(commentKey);
      }
    });

    // Maintain set size to prevent memory issues
    if (previousComments.size > 1000) {
      const commentsArray = Array.from(previousComments);
      previousComments = new Set(commentsArray.slice(-500));
    }
  } catch (error) {
    console.error("Error in monitoring:", error);
  }
}

// Configuration and startup
const config = {
  url: process.env.TARGET_URL,
  checkInterval: process.env.CHECK_INTERVAL || 5 * 60 * 1000, // Default 5 minutes
};

// Start monitoring
console.log("Starting comment monitoring...");
monitorComments(config.url);
setInterval(() => monitorComments(config.url), config.checkInterval);
