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

// Function to ensure all required placeholders are present in the template
function ensureAllPlaceholders(htmlTemplate: string, missingPlaceholders: string[], resumeContent: string, personalInfo: any): string {
  console.log("Adding missing placeholders manually:", missingPlaceholders)
  
  // Create a basic template structure if the template is severely malformed
  if (missingPlaceholders.length >= 6 || htmlTemplate.length < 500) {
    console.log("Template appears to be severely malformed, creating basic structure")
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{FULL_NAME}} - Resume</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 2px solid #333;
            padding-bottom: 1rem;
        }
        .header h1 {
            margin: 0;
            font-size: 2rem;
            color: #2c3e50;
        }
        .contact-info {
            margin: 0.5rem 0;
            font-size: 0.9rem;
        }
        .contact-info a {
            color: #3498db;
            text-decoration: none;
        }
        .resume-content {
            margin-top: 1.5rem;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{FULL_NAME}}</h1>
        <div class="contact-info">
            <span>{{EMAIL}}</span> | 
            <span>{{PHONE}}</span> | 
            <span>{{LOCATION}}</span>
        </div>
        <div class="contact-info">
            <a href="{{LINKEDIN}}">LinkedIn</a> | 
            <a href="{{PORTFOLIO}}">Portfolio</a>
        </div>
    </div>
    
    <div class="resume-content">
        {{RESUME_CONTENT}}
    </div>
</body>
</html>`
  }
  
  // Try to add missing placeholders to existing template
  let updatedTemplate = htmlTemplate
  
  // Add missing placeholders in appropriate locations
  if (missingPlaceholders.includes('{{FULL_NAME}}')) {
    // Try to find a title or h1 tag to replace
    if (updatedTemplate.includes('<h1>') && !updatedTemplate.includes('{{FULL_NAME}}')) {
      updatedTemplate = updatedTemplate.replace(/<h1[^>]*>([^<]*)<\/h1>/, '<h1>{{FULL_NAME}}</h1>')
    } else if (updatedTemplate.includes('<title>')) {
      updatedTemplate = updatedTemplate.replace(/<title>([^<]*)<\/title>/, '<title>{{FULL_NAME}} - Resume</title>')
      // Also add h1 in body if not present
      if (!updatedTemplate.includes('<h1>')) {
        updatedTemplate = updatedTemplate.replace('<body>', '<body>\n    <h1>{{FULL_NAME}}</h1>')
      }
    }
  }
  
  // Add contact info placeholders
  const contactPlaceholders = ['{{EMAIL}}', '{{PHONE}}', '{{LOCATION}}', '{{LINKEDIN}}', '{{PORTFOLIO}}']
  const missingContactInfo = contactPlaceholders.filter(p => missingPlaceholders.includes(p))
  
  if (missingContactInfo.length > 0) {
    const contactSection = `
    <div class="contact-info">
        <span>{{EMAIL}}</span> | 
        <span>{{PHONE}}</span> | 
        <span>{{LOCATION}}</span>
    </div>
    <div class="contact-links">
        <a href="{{LINKEDIN}}">LinkedIn</a> | 
        <a href="{{PORTFOLIO}}">Portfolio</a>
    </div>`
    
    // Try to add after h1 or at the beginning of body
    if (updatedTemplate.includes('<h1>')) {
      updatedTemplate = updatedTemplate.replace('</h1>', '</h1>' + contactSection)
    } else {
      updatedTemplate = updatedTemplate.replace('<body>', '<body>' + contactSection)
    }
  }
  
  // Add resume content placeholder
  if (missingPlaceholders.includes('{{RESUME_CONTENT}}')) {
    // Add at the end of body before closing tag
    updatedTemplate = updatedTemplate.replace('</body>', '    <div class="resume-content">{{RESUME_CONTENT}}</div>\n</body>')
  }
  
  return updatedTemplate
}

// Function to validate the generated template
function validateTemplate(htmlTemplate: string, expectResumeContentPlaceholder: boolean = true): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check for required HTML structure
  if (!htmlTemplate.toLowerCase().includes('<!doctype html>')) {
    errors.push('Missing DOCTYPE declaration')
  }
  
  if (!htmlTemplate.toLowerCase().includes('<html')) {
    errors.push('Missing HTML tag')
  }
  
  if (!htmlTemplate.toLowerCase().includes('<head>')) {
    errors.push('Missing HEAD section')
  }
  
  if (!htmlTemplate.toLowerCase().includes('<body>')) {
    errors.push('Missing BODY section')
  }
  
  if (!htmlTemplate.toLowerCase().includes('</body>')) {
    errors.push('Missing closing BODY tag')
  }
  
  if (!htmlTemplate.toLowerCase().includes('</html>')) {
    errors.push('Missing closing HTML tag')
  }
  
  // Check for required placeholders (conditionally include RESUME_CONTENT)
  const requiredPlaceholders = ['{{FULL_NAME}}', '{{EMAIL}}', '{{PHONE}}', '{{LOCATION}}', '{{LINKEDIN}}', '{{PORTFOLIO}}']
  if (expectResumeContentPlaceholder) {
    requiredPlaceholders.push('{{RESUME_CONTENT}}')
  }
  
  const missingPlaceholders = requiredPlaceholders.filter(placeholder => !htmlTemplate.includes(placeholder))
  
  if (missingPlaceholders.length > 0) {
    errors.push(`Missing required placeholders: ${missingPlaceholders.join(', ')}`)
  }
  
  // Check for basic CSS styling
  if (!htmlTemplate.toLowerCase().includes('<style>') && !htmlTemplate.toLowerCase().includes('style=')) {
    errors.push('No CSS styling found')
  }
  
  // Check minimum template length (should be substantial)
  if (htmlTemplate.length < 1000) {
    errors.push('Template appears to be too short or incomplete')
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  }
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

    // Enhanced Custom Style Generation Prompt with stricter requirements
    const customStylePrompt = `
You are an expert web developer and designer specializing in creating beautiful, professional resume templates. You MUST generate a COMPLETE HTML document with embedded CSS styling for a resume based on the style instructions.

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

ABSOLUTE REQUIREMENTS - FAILURE TO FOLLOW WILL RESULT IN REJECTION:

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

6. MANDATORY PLACEHOLDER INTEGRATION: You MUST include these EXACT placeholder variables in your HTML:
   - {{FULL_NAME}} - REQUIRED: for the person's name (use in <h1> or title)
   - {{EMAIL}} - REQUIRED: for email address (use in contact section)
   - {{PHONE}} - REQUIRED: for phone number (use in contact section)
   - {{LOCATION}} - REQUIRED: for location (use in contact section)
   - {{LINKEDIN}} - REQUIRED: for LinkedIn URL (use as clickable link)
   - {{PORTFOLIO}} - REQUIRED: for portfolio URL (use as clickable link)
   
   CRITICAL CONTENT INSTRUCTION: 
   - DO NOT include the {{RESUME_CONTENT}} placeholder in your template
   - Instead, directly incorporate and style the actual resume content provided above
   - Transform the raw resume content into beautifully styled HTML sections
   - The system will handle content placement automatically for optimal styling

7. ENHANCED STYLING REQUIREMENTS:
   - Interpret the user's style instructions while prioritizing space optimization
   - Create modern, ATS-friendly designs with balanced layouts
   - Ensure excellent print compatibility (use print media queries)
   - Use professional color schemes and typography
   - Make it visually appealing while maintaining readability and space efficiency
   - Ensure proper spacing and layout for PDF generation without waste

8. CONTENT INTEGRATION AND STYLING:
   - Transform the provided resume content into beautifully styled HTML sections
   - Preserve all sections, bullet points, and information from the original content
   - Convert plain text sections into proper HTML structure (headings, lists, paragraphs)
   - Enhance the visual presentation through CSS styling while keeping all content
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
            <!-- Resume content will be styled and integrated directly here -->
            <!-- Do not use {{RESUME_CONTENT}} placeholder -->
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

CRITICAL FINAL REQUIREMENTS - MANDATORY COMPLIANCE:
- Return ONLY the complete HTML code, no explanations or markdown formatting
- MUST include these 6 required placeholders: {{FULL_NAME}}, {{EMAIL}}, {{PHONE}}, {{LOCATION}}, {{LINKEDIN}}, {{PORTFOLIO}}
- DO NOT include {{RESUME_CONTENT}} placeholder - integrate the content directly into styled HTML
- Ensure the HTML is valid and well-structured with proper opening and closing tags
- The design should reflect the style instructions while prioritizing space optimization
- Focus on creating a visually stunning yet space-efficient professional resume template
- AVOID layouts that create excessive white space or unbalanced columns
- MUST generate the complete document - do not stop in the middle or truncate
- Include proper DOCTYPE, html, head, and body structure
- End with proper closing </body> and </html> tags
- Template must be fully functional with all content beautifully styled

VALIDATION CHECKLIST - VERIFY YOUR OUTPUT INCLUDES:
✓ DOCTYPE html declaration
✓ Complete <html>, <head>, and <body> structure
✓ 6 required placeholders exactly as specified (NOT including {{RESUME_CONTENT}})
✓ Resume content directly integrated and styled in HTML
✓ Embedded CSS styles in <style> tag
✓ Professional styling based on instructions
✓ Proper closing </body> and </html> tags

Generate the COMPLETE HTML template now (from DOCTYPE to closing HTML tag):
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

    // Validate that all required placeholders are present (excluding RESUME_CONTENT which should NOT be included)
    const requiredPlaceholders = ['{{FULL_NAME}}', '{{EMAIL}}', '{{PHONE}}', '{{LOCATION}}', '{{LINKEDIN}}', '{{PORTFOLIO}}']
    const missingPlaceholders = requiredPlaceholders.filter(placeholder => !htmlTemplate.includes(placeholder))
    
    // Check if RESUME_CONTENT placeholder is present (it should NOT be)
    const hasResumeContentPlaceholder = htmlTemplate.includes('{{RESUME_CONTENT}}')
    
    if (missingPlaceholders.length > 0 || hasResumeContentPlaceholder) {
      if (missingPlaceholders.length > 0) {
        console.warn("Missing placeholders detected:", missingPlaceholders)
      }
      if (hasResumeContentPlaceholder) {
        console.warn("Template incorrectly includes {{RESUME_CONTENT}} placeholder - this should be integrated directly")
      }
      console.log("Attempting to regenerate with stricter requirements...")
      
      // Create a fallback template with all required placeholders
      const fallbackPrompt = `
CRITICAL: The previous response was missing required placeholders. Generate a COMPLETE HTML resume template that MUST include these exact placeholders:

REQUIRED PLACEHOLDERS (MUST BE INCLUDED):
- {{FULL_NAME}} - for the person's name
- {{EMAIL}} - for email address  
- {{PHONE}} - for phone number
- {{LOCATION}} - for location
- {{LINKEDIN}} - for LinkedIn URL
- {{PORTFOLIO}} - for portfolio URL

CRITICAL CONTENT INSTRUCTION:
- DO NOT include {{RESUME_CONTENT}} placeholder
- Instead, directly integrate and style the resume content provided below

RESUME CONTENT TO STYLE:
${resumeContent}

STYLE INSTRUCTIONS:
${finalStyleInstructions}

Generate a COMPLETE HTML document with embedded CSS that includes:
1. DOCTYPE html declaration
2. Complete HTML structure with head and body
3. The 6 required placeholders exactly as specified above
4. Resume content directly integrated and beautifully styled
5. Professional styling based on the instructions
6. Proper closing </body> and </html> tags

The template MUST be complete and functional. Do not truncate or stop in the middle.

Return ONLY the HTML code, no explanations:
`

      try {
        const fallbackResponse = await generateWithGemini(fallbackPrompt, selectedModel)
        if (fallbackResponse.usedFallback) usedFallback = true
        
        let fallbackTemplate = fallbackResponse.result.trim()
        fallbackTemplate = fallbackTemplate.replace(/```html\n?/g, '').replace(/```\n?/g, '')
        
        // Ensure proper structure
        if (!fallbackTemplate.toLowerCase().includes('<!doctype html>')) {
          fallbackTemplate = '<!DOCTYPE html>\n' + fallbackTemplate
        }
        if (!fallbackTemplate.toLowerCase().includes('</html>')) {
          if (!fallbackTemplate.toLowerCase().includes('</body>')) {
            fallbackTemplate += '\n</body>'
          }
          fallbackTemplate += '\n</html>'
        }
        
        // Check if fallback has all placeholders and doesn't have RESUME_CONTENT
        const stillMissingPlaceholders = requiredPlaceholders.filter(placeholder => !fallbackTemplate.includes(placeholder))
        const fallbackHasResumeContent = fallbackTemplate.includes('{{RESUME_CONTENT}}')
        
        if (stillMissingPlaceholders.length === 0 && !fallbackHasResumeContent) {
          console.log("Fallback template generated successfully with correct placeholders")
          htmlTemplate = fallbackTemplate
        } else {
          if (stillMissingPlaceholders.length > 0) {
            console.warn("Fallback template still missing placeholders:", stillMissingPlaceholders)
          }
          if (fallbackHasResumeContent) {
            console.warn("Fallback template still includes {{RESUME_CONTENT}} placeholder")
          }
          // Use the original template and add missing placeholders manually
          // Note: We'll add {{RESUME_CONTENT}} back since ensureAllPlaceholders expects it
          const placeholdersToAdd = [...missingPlaceholders]
          if (!hasResumeContentPlaceholder) {
            placeholdersToAdd.push('{{RESUME_CONTENT}}')
          }
          htmlTemplate = ensureAllPlaceholders(htmlTemplate, placeholdersToAdd, resumeContent, personalInfo)
        }
      } catch (fallbackError) {
        console.error("Fallback generation failed:", fallbackError)
        // Use the original template and add missing placeholders manually
        // Note: We'll add {{RESUME_CONTENT}} back since ensureAllPlaceholders expects it
        const placeholdersToAdd = [...missingPlaceholders]
        if (!hasResumeContentPlaceholder) {
          placeholdersToAdd.push('{{RESUME_CONTENT}}')
        }
        htmlTemplate = ensureAllPlaceholders(htmlTemplate, placeholdersToAdd, resumeContent, personalInfo)
      }
    } else {
      // Template has all required placeholders and correctly doesn't have {{RESUME_CONTENT}}
      // This is the desired behavior - the AI has integrated the content directly
      if (!hasResumeContentPlaceholder) {
        console.log("Template correctly excludes {{RESUME_CONTENT}} - content is already integrated, no further processing needed")
        // Don't add the placeholder back since content is already styled and integrated
      }
    }

    // Post-process HTML for better space optimization
    htmlTemplate = optimizeLayoutSpacing(htmlTemplate)

    // Final validation to ensure template is complete and functional
    // Don't expect RESUME_CONTENT placeholder if content is already integrated
    const expectResumeContentPlaceholder = htmlTemplate.includes('{{RESUME_CONTENT}}')
    const finalValidation = validateTemplate(htmlTemplate, expectResumeContentPlaceholder)
    if (!finalValidation.isValid) {
      console.error("Final validation failed:", finalValidation.errors)
      throw new Error(`Generated template failed validation: ${finalValidation.errors.join(', ')}`)
    }

    console.log("Custom resume style generated and validated successfully")

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