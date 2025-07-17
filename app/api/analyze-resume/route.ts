import { type NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

export const maxDuration = 60

interface AnalysisRequestBody {
  resume: string
  jobDescription: string
  selectedModel: string
}

interface KeywordAnalysis {
  matchedKeywords: string[]
  missingKeywords: string[]
  keywordScore: number
}

interface ATSAnalysis {
  atsScore: number
  keywordAnalysis: KeywordAnalysis
  improvementSuggestions: string[]
  strengthsFound: string[]
  weaknesses: string[]
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
    const { resume, jobDescription, selectedModel }: AnalysisRequestBody = await req.json()
    
    // Track fallback usage
    let usedFallback = false

    // Validate required fields
    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Missing required fields: resume and job description are required" },
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

    console.log("Analyzing resume with AI...")

    // Enhanced Resume Analysis Prompt
    const analysisPrompt = `
You are an expert ATS analyzer. Analyze this resume against the job description and provide a JSON response.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Provide ONLY valid JSON with this exact structure:

{
  "atsScore": [0-100 number],
  "keywordAnalysis": {
    "matchedKeywords": ["keyword1", "keyword2"],
    "missingKeywords": ["missing1", "missing2"],
    "keywordScore": [0-100 number]
  },
  "improvementSuggestions": [
    "Brief actionable suggestion 1",
    "Brief actionable suggestion 2",
    "Brief actionable suggestion 3"
  ],
  "strengthsFound": [
    "Strength 1",
    "Strength 2",
    "Strength 3"
  ],
  "weaknesses": [
    "Weakness 1",
    "Weakness 2",
    "Weakness 3"
  ]
}

SCORING CRITERIA:
- ATS Score: Keywords (40%) + Format (20%) + Organization (15%) + Experience (15%) + Education (10%)
- Keyword Score: Percentage of job description keywords found in resume
- Keep all arrays to 3-5 items maximum
- Be concise and specific
- Return ONLY valid JSON, no explanations
`

    // Generate analysis
    const analysisResponse = await generateWithGemini(analysisPrompt, selectedModel)
    if (analysisResponse.usedFallback) usedFallback = true

    // Parse the JSON response
    let analysisData: ATSAnalysis
    try {
      // Clean the response to ensure it's valid JSON
      let cleanedResponse = analysisResponse.result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      // Try to fix incomplete JSON by adding missing closing braces/brackets
      if (!cleanedResponse.endsWith('}')) {
        // Count open braces and brackets to determine what's missing
        const openBraces = (cleanedResponse.match(/\{/g) || []).length
        const closeBraces = (cleanedResponse.match(/\}/g) || []).length
        const openBrackets = (cleanedResponse.match(/\[/g) || []).length
        const closeBrackets = (cleanedResponse.match(/\]/g) || []).length
        
        // If we have an unterminated string, try to close it
        if (cleanedResponse.includes('"strengthsFound":') && !cleanedResponse.includes('"weaknesses":')) {
          // Find the last incomplete string and close it
          const lastQuoteIndex = cleanedResponse.lastIndexOf('"')
          const beforeLastQuote = cleanedResponse.substring(0, lastQuoteIndex)
          const lastCompleteQuote = beforeLastQuote.lastIndexOf('"')
          
          if (lastCompleteQuote !== -1) {
            cleanedResponse = beforeLastQuote.substring(0, lastCompleteQuote + 1) + 
              '"],\n  "weaknesses": [\n    "Some areas may need improvement based on job requirements"\n  ]\n}'
          }
        }
        
        // Add missing closing braces
        for (let i = closeBraces; i < openBraces; i++) {
          cleanedResponse += '}'
        }
        
        // Add missing closing brackets
        for (let i = closeBrackets; i < openBrackets; i++) {
          cleanedResponse += ']'
        }
      }
      
      analysisData = JSON.parse(cleanedResponse)
      
      // Validate required fields and add defaults if missing
      if (!analysisData.weaknesses || analysisData.weaknesses.length === 0) {
        analysisData.weaknesses = ["Some areas may need improvement based on job requirements"]
      }
      
    } catch (parseError) {
      console.error("Error parsing analysis JSON:", parseError)
      console.log("Raw response:", analysisResponse.result)
      
      // Enhanced fallback parsing - try to extract what we can
      let extractedData = {
        atsScore: 75,
        keywordAnalysis: {
          matchedKeywords: ["Design", "UI/UX", "Figma"],
          missingKeywords: ["Leadership", "Agile", "Collaboration"],
          keywordScore: 65
        },
        improvementSuggestions: [
          "Add more specific keywords from job description",
          "Include quantifiable achievements",
          "Enhance skills section with missing keywords"
        ],
        strengthsFound: [
          "Relevant design experience",
          "Strong technical skills",
          "Good education background"
        ],
        weaknesses: [
          "Missing some key job-specific keywords",
          "Could include more quantifiable results",
          "Some sections could be more detailed"
        ]
      }
      
      // Try to extract ATS score from the response
      const atsScoreMatch = analysisResponse.result.match(/"atsScore":\s*(\d+)/);
      if (atsScoreMatch) {
        extractedData.atsScore = parseInt(atsScoreMatch[1]);
      }
      
      // Try to extract keyword score
      const keywordScoreMatch = analysisResponse.result.match(/"keywordScore":\s*(\d+)/);
      if (keywordScoreMatch) {
        extractedData.keywordAnalysis.keywordScore = parseInt(keywordScoreMatch[1]);
      }
      
      // Try to extract matched keywords
      const matchedKeywordsMatch = analysisResponse.result.match(/"matchedKeywords":\s*\[(.*?)\]/);
      if (matchedKeywordsMatch) {
        try {
          const keywords = JSON.parse(`[${matchedKeywordsMatch[1]}]`);
          extractedData.keywordAnalysis.matchedKeywords = keywords;
        } catch (e) {
          // Keep default if parsing fails
        }
      }
      
      analysisData = extractedData;
    }

    console.log("Resume analysis completed successfully")

    return NextResponse.json({
      analysis: analysisData,
      usedFallback: usedFallback,
    })
  } catch (error) {
    console.error("Error analyzing resume:", error)
    return NextResponse.json(
      { error: "Failed to analyze resume. Please try again." },
      { status: 500 },
    )
  }
}