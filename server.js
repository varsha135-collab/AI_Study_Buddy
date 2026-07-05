const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Groq = require("groq-sdk");
require("dotenv").config();

// Use the fork you installed so it imports cleanly as a function
const pdfParse = require("pdf-parse-fork"); 

let extractedText = ""; // Global variable to store the parsed PDF text across all routes
const app = express();
const PORT = process.env.PORT || 3002;
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(express.static(path.join(__dirname, "frontend")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.json({
    message: "PDF uploaded successfully!",
    filename: req.file.filename,
  });
});

app.post("/summarize", async (req, res) => {
    try {
        const files = fs.readdirSync("uploads/");
        // Filter to ensure we only look at files, avoiding hidden folders or system files
        const validFiles = files.filter(f => !f.startsWith('.')); 
        
        if (validFiles.length === 0) {
            return res.status(400).json({ message: "No PDF uploaded" });
        }

        const latestFile = validFiles[validFiles.length - 1];
        const filePath = path.join(__dirname, "uploads", latestFile);

        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        
        // CRITICAL FIX: Save the extracted text into the GLOBAL variable so /generate-quiz can access it!
        extractedText = pdfData.text; 

        if (!extractedText || extractedText.trim() === "") {
            return res.status(400).json({ message: "Could not extract text. The PDF might be scanned images." });
        }

        // Limit the text to avoid crashing the Groq API (8192 token limit)
        const safeText = extractedText.substring(0, 25000); 

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant", 
            messages: [
                {
                    role: "user",
                    content: `Summarize this text into clean, well-structured sections using HTML tags. 
                    Follow these exact formatting rules:
                    - Use <h3> for the main headings (e.g., <h3>Contact Details</h3>)
                    - Use <ul> and <li> for the bullet points
                    - Use <strong> to highlight key terms or dates
                    - Do NOT use markdown asterisks (**) or raw dashes (-).
                    
                    Here is the text to summarize:\n\n${safeText}`
                }
            ]
        });

        const summary = completion.choices[0].message.content;
        res.json({ summary });

    } catch (error) {
        console.error("Detailed Error in summarize:", error.error || error.message || error);
        res.status(500).json({ 
            message: "Error generating summary. Check the backend terminal for details." 
        });
    }
});

app.post("/generate-quiz", async (req, res) => {
    try {
        if (!extractedText || extractedText.trim() === "") {
            const files = fs.readdirSync("uploads/");
            const validFiles = files.filter(f => !f.startsWith('.')); 
            
            if (validFiles.length === 0) {
                return res.status(400).json({ error: "No PDF found in uploads. Please upload a PDF first." });
            }

            const latestFile = validFiles[validFiles.length - 1];
            const filePath = path.join(__dirname, "uploads", latestFile);
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            
            extractedText = pdfData.text;
        }

        if (!extractedText || extractedText.trim() === "") {
            return res.status(400).json({ error: "Could not extract text from the uploaded PDF." });
        }

        const safeText = extractedText.substring(0, 6000);

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: "You are a strict HTML quiz generator. Do not include introductory text, explanations, or text lists. Output ONLY pure HTML blocks matching the requested format."
                },
                {
                    role: "user",
                    content: `Based on the following text, generate 3 multiple-choice questions (MCQs).
                    
                    CRITICAL FORMATTING INSTRUCTIONS:
                    - For each question, output a separate <div class="quiz-block">.
                    - Inside it, put the question text inside an <h3> tag.
                    - Then, create a <div class="options-container"> containing exactly 4 clickable option buttons.
                    - Identify which option is the correct answer based on the text.
                    - For the single CORRECT option, the button HTML must be exactly: 
                      <button class="option-btn" onclick="checkAnswer(this, true)">Option Text</button>
                    - For the 3 WRONG options, the button HTML must be exactly: 
                      <button class="option-btn" onclick="checkAnswer(this, false)">Option Text</button>
                    
                    - Crucial: At the very bottom of each quiz-block (outside the options-container), write exactly this empty tag: <div class="feedback"></div>
                    
                    - NEVER print sentences like "Correct Answer: A" or use text lists like "1. A, 2. B". The answer validation must exist ONLY within the true/false parameter inside the onclick function.

                    Here is the text:\n\n${safeText}`
                }
            ]
        });

        const quizHtml = completion.choices[0].message.content;
        res.json({ quiz: quizHtml });

    } catch (error) {
        console.error("Detailed Error in generate-quiz:", error);
        res.status(500).json({ error: "Error generating quiz. Check terminal details." });
    }
});

app.listen(PORT, () => {
  console.log(`Successfully running at http://localhost:${PORT}`);
});