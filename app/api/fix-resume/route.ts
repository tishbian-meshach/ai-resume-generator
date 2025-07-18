import { type NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

export const maxDuration = 60

interface FixRequestBody {
  resume: string
  jobDescription: string
  analysisReport: string
  selectedModel: string
}

// Google Generative AI API configuration
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

// Function to get API URL based on selected model
const getGoogleAPIURL = (model: string) => {
  return `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GOOGLE_API_KEY}`
}

// OpenRouter configuration for fallback
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://ai-resumex.vercel.app",
    "X-Title": "AI Resume Generator",
  },
})

// Use single OpenRouter model for all fallbacks
const getOpenRouterModel = () => {
  return "google/gemini-2.0-flash-exp:free"
}

// Function to clean up excessive bold formatting
function cleanExcessiveBoldFormatting(text: string): string {
  // Split text into lines to process each line
  const lines = text.split('\n')
  
  const cleanedLines = lines.map(line => {
    // Skip section headers (lines that are entirely bold and uppercase)
    if (line.match(/^\*\*[A-Z\s]+\*\*$/)) {
      return line // Keep section headers as they are
    }
    
    // For content lines, limit bold formatting
    // Count the number of bold segments in the line
    const boldMatches = line.match(/\*\*[^*]+\*\*/g) || []
    
    // If there are more than 2 bold segments in a single line, remove excess bold
    if (boldMatches.length > 2) {
      // Keep only the first 2 bold segments, remove bold from the rest
      let processedLine = line
      let boldCount = 0
      
      processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, (match, content) => {
        boldCount++
        if (boldCount <= 2) {
          return match // Keep the first 2 bold segments
        } else {
          return content // Remove bold formatting from excess segments
        }
      })
      
      return processedLine
    }
    
    // For lines with 1-2 bold segments, check if they're appropriate
    if (boldMatches.length > 0) {
      // Remove bold from common words that shouldn't be bold
      const inappropriateBoldWords = [
        'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
        'below', 'between', 'among', 'under', 'over', 'is', 'are', 'was', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'can', 'shall'
      ]
      
      let processedLine = line
      inappropriateBoldWords.forEach(word => {
        const regex = new RegExp(`\\*\\*(${word})\\*\\*`, 'gi')
        processedLine = processedLine.replace(regex, '$1')
      })
      
      return processedLine
    }
    
    return line
  })
  
  return cleanedLines.join('\n')
}

// Fallback function using OpenRouter
async function generateWithOpenRouter(prompt: string, model: string): Promise<string> {
  try {
    console.log(`Fallback: Using OpenRouter with model ${getOpenRouterModel()}`)
    
    const completion = await openai.chat.completions.create({
      model: getOpenRouterModel(),
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 8000,
      temperature: 0.7,
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error("No content generated from OpenRouter")
    }

    return result
  } catch (error) {
    console.error("Error calling OpenRouter:", error)
    throw error
  }
}

async function generateWithGemini(prompt: string, model: string): Promise<{result: string, usedFallback: boolean}> {
  try {
    const response = await fetch(getGoogleAPIURL(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8000,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Google API Error:", errorData)
      
      // Check if the error is a 503 (overloaded) or other retryable error
      if (response.status === 503 || response.status === 429 || response.status === 502) {
        console.log(`Google API returned ${response.status}, falling back to OpenRouter...`)
        const fallbackResult = await generateWithOpenRouter(prompt, model)
        return { result: fallbackResult, usedFallback: true }
      }
      
      throw new Error(`Google API request failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Invalid response format from Google API")
    }

    return { result: data.candidates[0].content.parts[0].text, usedFallback: false }
  } catch (error) {
    console.error("Error calling Google Generative AI:", error)
    
    // If it's a network error or other failure, try OpenRouter as fallback
    if (error instanceof Error && (
      error.message.includes('fetch') || 
      error.message.includes('network') || 
      error.message.includes('503') ||
      error.message.includes('overloaded')
    )) {
      console.log("Network error detected, falling back to OpenRouter...")
      try {
        const fallbackResult = await generateWithOpenRouter(prompt, model)
        return { result: fallbackResult, usedFallback: true }
      } catch (fallbackError) {
        console.error("Both Google API and OpenRouter failed:", fallbackError)
        throw new Error("Both primary and fallback AI services are unavailable")
      }
    }
    
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, analysisReport, selectedModel }: FixRequestBody = await req.json()
    
    // Track fallback usage
    let usedFallback = false

    // Validate required fields
    if (!resume || !jobDescription || !analysisReport) {
      return NextResponse.json(
        { error: "Missing required fields: resume, job description, and analysis report are required" },
        { status: 400 },
      )
    }

    // Validate selected model
    const validModels = ["gemini-2.5-pro", "gemini-2.0-flash"]
    if (!selectedModel || !validModels.includes(selectedModel)) {
      return NextResponse.json(
        { error: "Invalid model selected" },
        { status: 400 },
      )
    }

    console.log("Fixing resume based on analysis...")

    // Enhanced Resume Fix Prompt
    const fixPrompt = `
You are an expert resume writer and ATS optimization specialist. Fix and improve the following resume based on the analysis report and job description.

CURRENT RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

ANALYSIS REPORT:
${analysisReport}

IMPROVEMENT INSTRUCTIONS:
1. Fix all weaknesses identified in the analysis
2. Integrate missing keywords naturally into the content
3. Enhance sections that need improvement
4. Maintain the original formatting and structure
5. Keep all original achievements and experiences
6. Add quantifiable metrics where possible
7. Ensure ATS optimization while maintaining readability

SPECIFIC REQUIREMENTS:
- Address ALL missing keywords from the analysis
- Strengthen weak sections identified in the report
- Enhance keyword density without keyword stuffing
- Improve overall ATS score potential
- Maintain professional language and tone
- Keep the resume concise and impactful
- Ensure all improvements are relevant to the job description

CRITICAL RULES:
- Do NOT change the person's name, contact information, or basic structure
- Do NOT add fake experience or qualifications
- Do NOT remove important existing content
- DO enhance existing content with better keywords and descriptions
- DO add relevant skills and technologies mentioned in job description
- DO improve bullet points to be more ATS-friendly
- DO ensure keyword optimization throughout

FORMATTING RULES:
- Use **bold** ONLY for section headers (like **PROFESSIONAL SUMMARY**, **EXPERIENCE**, etc.)
- Do NOT use **bold** for individual keywords within sentences
- Do NOT use **bold** for skills, technologies, or job-related terms in paragraphs
- Keep the text natural and readable without excessive formatting
- Integrate keywords naturally into sentences without highlighting them
- Maintain clean, professional formatting throughout

Generate an improved version of the resume that addresses all the issues identified in the analysis report while maintaining authenticity, professionalism, and clean formatting without excessive bold text.
`

    // Generate fixed resume
    const fixResponse = await generateWithGemini(fixPrompt, selectedModel)
    if (fixResponse.usedFallback) usedFallback = true

    // Clean up excessive bold formatting
    const cleanedResume = cleanExcessiveBoldFormatting(fixResponse.result)

    console.log("Resume fix completed successfully")

    return NextResponse.json({
      fixedResume: cleanedResume,
      usedFallback: usedFallback,
    })
  } catch (error) {
    console.error("Error fixing resume:", error)
    return NextResponse.json(
      { error: "Failed to fix resume. Please try again." },
      { status: 500 },
    )
  }
}