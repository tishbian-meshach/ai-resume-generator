import { type NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

export const maxDuration = 60

interface CustomStyleRequestBody {
  resumeContent: string
  personalInfo: {
    fullName: string
    email: string
    phone: string
    location: string
    linkedIn: string
    portfolio: string
  }
  styleInstructions: string
  isSurpriseMe: boolean
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

// Function to optimize layout spacing and prevent white space issues
function optimizeLayoutSpacing(htmlTemplate: string): string {
  // Add CSS optimizations for better space utilization
  const spaceOptimizationCSS = `
    /* Space Optimization Enhancements */
    .resume-container, .resume-container-two-col {
      min-height: auto !important;
    }
    
    /* Prevent excessive white space in multi-column layouts */
    @media print {
      .sidebar, .left-column {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      /* Ensure balanced column heights */
      .two-column-layout {
        display: block !important;
      }
      
      .two-column-layout .left-column,
      .two-column-layout .right-column {
        width: 100% !important;
        float: none !important;
        display: block !important;
      }
    }
    
    /* Better spacing for single column layouts */
    .single-column {
      width: 100%;
      max-width: 100%;
    }
    
    /* Optimize section spacing */
    section, .section {
      margin-bottom: 1.2rem;
      page-break-inside: avoid;
    }
    
    /* Prevent orphaned content */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      break-after: avoid;
    }
    
    /* Better list spacing */
    ul, ol {
      margin-bottom: 0.8rem;
    }
    
    li {
      margin-bottom: 0.2rem;
      page-break-inside: avoid;
    }
  `
  
  // Insert the optimization CSS before the closing </style> tag
  if (htmlTemplate.includes('</style>')) {
    htmlTemplate = htmlTemplate.replace('</style>', spaceOptimizationCSS + '\n</style>')
  }
  
  // If the template uses grid with unbalanced columns, suggest single column for print
  if (htmlTemplate.includes('grid-template-columns') && htmlTemplate.includes('1fr 2fr')) {
    const printOptimization = `
    @media print {
      .resume-container-two-col, .two-column-layout {
        display: block !important;
        grid-template-columns: none !important;
      }
      
      .left-column, .sidebar {
        width: 100% !important;
        margin-bottom: 1rem;
      }
      
      .right-column, .main-content {
        width: 100% !important;
      }
    }
    `
    
    if (htmlTemplate.includes('@media print')) {
      // Add to existing print media query
      htmlTemplate = htmlTemplate.replace('@media print {', '@media print {' + printOptimization)
    } else {
      // Add new print media query
      htmlTemplate = htmlTemplate.replace('</style>', printOptimization + '\n</style>')
    }
  }
  
  return htmlTemplate
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
    const { resumeContent, personalInfo, styleInstructions, isSurpriseMe, selectedModel }: CustomStyleRequestBody = await req.json()
    
    // Track fallback usage
    let usedFallback = false

    // Validate required fields
    if (!resumeContent || (!isSurpriseMe && !styleInstructions) || !personalInfo.fullName) {
      return NextResponse.json(
        { error: "Missing required fields: resume content and personal info are required" },
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

    console.log("Generating custom resume style with AI...")

    // Determine the style instructions based on mode
    let finalStyleInstructions = styleInstructions
    
    if (isSurpriseMe) {
      // Generate random creative style instructions
      const surpriseStyles = [
        "Creative modern design with vibrant teal and orange accents, unique typography mixing serif headers with sans-serif body text, asymmetrical layout with creative section dividers, professional yet artistic feel",
        "Elegant minimalist design with deep navy blue headers, gold accent lines, sophisticated serif font for headers and clean sans-serif for content, luxury professional appearance",
        "Bold contemporary style with bright coral accent color, geometric section dividers, modern sans-serif fonts, clean grid layout with subtle shadows and rounded corners",
        "Classic professional design with forest green accents, traditional serif fonts, clean borders and dividers, timeless business appearance with excellent readability",
        "Modern tech-inspired design with electric blue and gray color scheme, sleek sans-serif fonts, subtle gradients, clean lines and contemporary spacing",
        "Warm professional style with burgundy and cream colors, elegant typography, subtle texture backgrounds, sophisticated business appearance",
        "Fresh contemporary design with emerald green accents, modern mixed fonts, creative use of white space, professional yet approachable feel",
        "Sophisticated corporate style with charcoal gray and silver accents, premium typography, clean geometric elements, executive-level professional appearance"
      ]
      
      finalStyleInstructions = surpriseStyles[Math.floor(Math.random() * surpriseStyles.length)]
      console.log("Surprise Me style selected:", finalStyleInstructions)
    }

    // Enhanced Custom Style Generation Prompt
    const customStylePrompt = `
You are an expert web developer and designer specializing in creating beautiful, professional resume templates with optimal space utilization. Generate a complete HTML structure with embedded CSS styling for a resume based on the style instructions.

RESUME CONTENT TO STYLE:
${resumeContent}

PERSONAL INFORMATION:
- Name: ${personalInfo.fullName}
- Email: ${personalInfo.email}
- Phone: ${personalInfo.phone}
- Location: ${personalInfo.location}
- LinkedIn: ${personalInfo.linkedIn}
- Portfolio: ${personalInfo.portfolio}

STYLE INSTRUCTIONS:
${finalStyleInstructions}

${isSurpriseMe ? 'MODE: SURPRISE ME - Be creative and unique while maintaining professionalism!' : 'MODE: CUSTOM INSTRUCTIONS - Follow the user\'s specific requirements.'}

CRITICAL REQUIREMENTS - MUST FOLLOW:

0. COMPLETE CONTENT GENERATION:
   - Generate the COMPLETE HTML document from start to finish
   - Include ALL sections from the resume content
   - Do NOT stop in the middle or truncate any content
   - Ensure the closing </body> and </html> tags are included
   - The template must be fully functional and complete

1. BALANCED LAYOUT DESIGN:
   - If creating multi-column layouts, ensure columns are balanced in height
   - Distribute content evenly to minimize white space
   - For 2-column layouts: Left column should be 30-35% width, right column 65-70%
   - Avoid long empty spaces at the bottom of any column
   - Consider content length when deciding column distribution

2. INTELLIGENT CONTENT DISTRIBUTION:
   - Analyze the resume content length before designing layout
   - For short content: Use single-column layout to avoid excessive white space
   - For medium content: Use balanced 2-column with strategic section placement
   - For long content: Use single-column or carefully balanced multi-column
   - Place shorter sections (Skills, Education, Certifications) in narrower columns
   - Place longer sections (Experience, Projects) in wider columns or full-width

3. SPACE UTILIZATION STRATEGIES:
   - Use CSS Grid or Flexbox for better control over layout balance
   - Implement dynamic height balancing between columns
   - Add strategic padding/margins instead of leaving large empty areas
   - Use section breaks and visual elements to fill appropriate spaces
   - Ensure content flows naturally without awkward gaps

4. LAYOUT DECISION LOGIC:
   - Single Column: Best for most resumes, ensures no white space issues
   - Two Column: Only if content can be balanced (skills/contact info in sidebar)
   - Avoid three or more columns unless content is extensive
   - Consider print page breaks and how content will flow

5. STRUCTURE: Create a complete HTML document with embedded CSS that includes:
   - DOCTYPE html declaration
   - Complete HTML structure with head and body
   - All CSS styles embedded in a <style> tag in the head
   - Professional, print-friendly layout with optimal space usage

6. DYNAMIC CONTENT INTEGRATION: Use these EXACT placeholder variables in your HTML:
   - {{FULL_NAME}} - for the person's name
   - {{EMAIL}} - for email address
   - {{PHONE}} - for phone number
   - {{LOCATION}} - for location
   - {{LINKEDIN}} - for LinkedIn URL
   - {{PORTFOLIO}} - for portfolio URL
   - {{RESUME_CONTENT}} - for the main resume content (preserve all formatting, sections, and structure)

7. ENHANCED STYLING REQUIREMENTS:
   - Interpret the user's style instructions while prioritizing space optimization
   - Create modern, ATS-friendly designs with balanced layouts
   - Ensure excellent print compatibility (use print media queries)
   - Use professional color schemes and typography
   - Make it visually appealing while maintaining readability and space efficiency
   - Ensure proper spacing and layout for PDF generation without waste

8. CONTENT PRESERVATION:
   - Do NOT modify the actual resume content structure or text
   - Preserve all sections, bullet points, and formatting from the original content
   - Only enhance the visual presentation through CSS styling
   - Keep all professional experience, skills, education, etc. exactly as provided
   - Organize content intelligently to minimize white space

9. RESPONSIVE DESIGN WITH SPACE AWARENESS:
   - Ensure the design works well for PDF generation
   - Use appropriate font sizes and spacing that maximize content density
   - Make sure content fits well on standard letter-size pages
   - Include print-specific CSS optimizations for space utilization
   - Avoid layouts that create excessive white space on printed pages

10. PROFESSIONAL STANDARDS:
    - Use web-safe fonts with fallbacks
    - Ensure high contrast for readability
    - Follow modern design principles with space efficiency in mind
    - Make it suitable for professional environments
    - Prioritize content visibility over decorative white space

LAYOUT RECOMMENDATIONS BASED ON CONTENT:

FOR SINGLE-COLUMN LAYOUTS (RECOMMENDED FOR MOST CASES):
- Header with contact info at top
- Sections flow vertically with consistent spacing
- No risk of unbalanced columns or white space
- Easy to read and ATS-friendly
- Professional and clean appearance

FOR TWO-COLUMN LAYOUTS (USE CAREFULLY):
- Left sidebar (30-35%): Contact info, Skills, Certifications, Education
- Right main area (65-70%): Professional Summary, Experience, Projects
- Ensure left column content fills most of the available height
- Use background colors or borders to visually balance if needed
- Only use if you can ensure balanced content distribution

EXAMPLE OPTIMIZED STRUCTURE:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{FULL_NAME}} - Resume</title>
    <style>
        /* Space-optimized CSS based on user instructions */
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            background: white;
        }
        
        /* Choose layout based on content analysis */
        /* Single-column for optimal space usage (recommended) */
        .resume-container {
            display: block;
            width: 100%;
        }
        
        /* OR Two-column only if content can be balanced */
        .resume-container-two-col {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 1.5rem;
            min-height: 100vh;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .resume-container-two-col {
                min-height: auto;
            }
        }
    </style>
</head>
<body>
    <div class="resume-container">
        <header>
            <h1>{{FULL_NAME}}</h1>
            <div class="contact-info">
                <span>{{EMAIL}}</span> | 
                <span>{{PHONE}}</span> | 
                <span>{{LOCATION}}</span>
            </div>
            <div class="links">
                <a href="{{LINKEDIN}}">LinkedIn</a> | 
                <a href="{{PORTFOLIO}}">Portfolio</a>
            </div>
        </header>
        
        <main>
            {{RESUME_CONTENT}}
        </main>
    </div>
</body>
</html>
\`\`\`

CRITICAL SPACE OPTIMIZATION RULES:
1. ANALYZE the resume content length before choosing layout
2. PREFER single-column layouts for better space utilization
3. If using multi-column, ensure content is distributed to minimize white space
4. AVOID creating layouts where one column is significantly shorter than others
5. Use CSS Grid/Flexbox for better control over space distribution
6. Test that the layout works well for both screen and print
7. Prioritize readability and professional appearance over complex layouts

CRITICAL FINAL REQUIREMENTS:
- Return ONLY the complete HTML code, no explanations or markdown formatting
- Ensure the HTML is valid and well-structured with proper opening and closing tags
- The design should reflect the style instructions while prioritizing space optimization
- All placeholder variables must be included exactly as specified
- Focus on creating a visually stunning yet space-efficient professional resume template
- AVOID layouts that create excessive white space or unbalanced columns
- MUST generate the complete document - do not stop in the middle
- Include proper DOCTYPE, html, head, and body structure
- End with proper closing </body> and </html> tags

Generate the COMPLETE HTML template now with optimal space utilization (ensure you include the full document from DOCTYPE to closing HTML tag):
`

    // Generate custom styled resume
    const styleResponse = await generateWithGemini(customStylePrompt, selectedModel)
    if (styleResponse.usedFallback) usedFallback = true

    // Clean up the response to ensure we get only HTML
    let htmlTemplate = styleResponse.result.trim()
    
    // Remove markdown code blocks if present
    htmlTemplate = htmlTemplate.replace(/```html\n?/g, '').replace(/```\n?/g, '')
    
    // Ensure it starts with DOCTYPE
    if (!htmlTemplate.toLowerCase().includes('<!doctype html>')) {
      console.log("Adding DOCTYPE to generated HTML")
      htmlTemplate = '<!DOCTYPE html>\n' + htmlTemplate
    }

    // Ensure it ends with proper closing tags
    if (!htmlTemplate.toLowerCase().includes('</html>')) {
      console.log("Adding missing closing HTML tag")
      if (!htmlTemplate.toLowerCase().includes('</body>')) {
        htmlTemplate += '\n</body>'
      }
      htmlTemplate += '\n</html>'
    }

    // Validate that all required placeholders are present
    const requiredPlaceholders = ['{{FULL_NAME}}', '{{EMAIL}}', '{{PHONE}}', '{{LOCATION}}', '{{LINKEDIN}}', '{{PORTFOLIO}}', '{{RESUME_CONTENT}}']
    const missingPlaceholders = requiredPlaceholders.filter(placeholder => !htmlTemplate.includes(placeholder))
    
    if (missingPlaceholders.length > 0) {
      console.warn("Missing placeholders:", missingPlaceholders)
      // Could add fallback logic here if needed
    }

    // Post-process HTML for better space optimization
    htmlTemplate = optimizeLayoutSpacing(htmlTemplate)

    console.log("Custom resume style generated successfully")

    return NextResponse.json({
      htmlTemplate: htmlTemplate,
      usedFallback: usedFallback,
    })
  } catch (error) {
    console.error("Error generating custom style:", error)
    return NextResponse.json(
      { error: "Failed to generate custom resume style. Please try again." },
      { status: 500 },
    )
  }
}