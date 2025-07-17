import { type NextRequest, NextResponse } from "next/server"
import OpenAI from 'openai'

export const maxDuration = 60

interface PersonalInfo {
  fullName: string
  email: string
  phone: string
  location: string
  linkedIn: string
  portfolio: string
  summary: string
  skills: string
  experience: string
  education: string
  certifications: string
}

interface RequestBody {
  personalInfo: PersonalInfo
  jobDescription: string
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
  apiKey: process.env.OPENROUTER_API_KEY ,
  defaultHeaders: {
    "HTTP-Referer": "https://ai-resumex.vercel.app",
    "X-Title": "AI Resume Generator",
  },
})

// Use single OpenRouter model for all fallbacks
const getOpenRouterModel = () => {
  return "google/gemini-2.0-flash-exp:free"
}

// Target keywords for design internships
const INCLUDE_KEYWORDS = [
  "Graphic Design Intern",
  "UI/UX Intern",
  "Design Intern",
  "Visual Design Intern",
  "Product Design Intern",
]

const EXCLUDE_KEYWORDS = ["Senior", "Lead", "Manager", "Director", "unpaid"]

const USER_SKILLS = [
  "Figma",
  "Adobe XD",
  "Photoshop",
  "Illustrator",
  "HTML",
  "CSS",
  "UI Design",
  "UX Design",
  "AI-Powered Design",
  "Prompt Engineering",
  "ChatGPT",
  "Midjourney",
  "DALL-E",
]

function cleanResumeContent(content: string): string {
  // Remove common instructional phrases and placeholders
  const cleanupPatterns = [
    /This resume is optimized for.*?$/gm,
    /Remember to.*?$/gm,
    /\[Client Name\]/g,
    /\[Company Name\]/g,
    /\[Project Name\]/g,
    /\(quantify if possible\)/g,
    /\(Include.*?\)/g,
    /\*\(Include.*?\)\*/g,
    /Quantify.*?$/gm,
    /Replace.*?$/gm,
  ]
  
  let cleaned = content
  cleanupPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Reduce excessive AI references while keeping meaningful ones
  // Only remove AI when it's redundant or overused, but keep it when it's important
  cleaned = cleaned.replace(/AI-enhanced /g, '')
  cleaned = cleaned.replace(/AI-powered /g, '')
  cleaned = cleaned.replace(/AI-assisted /g, '')
  cleaned = cleaned.replace(/AI-driven /g, '')
  cleaned = cleaned.replace(/AI-optimized /g, 'optimized ')
  
  // Keep AI in important contexts like certifications, job titles, and key technologies
  // Don't replace AI when it's part of meaningful phrases
  
  // Remove multiple empty lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n')
  
  return cleaned.trim()
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
      max_tokens: 4000,
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
          maxOutputTokens: 3000,
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
    const { personalInfo, jobDescription, selectedModel }: RequestBody = await req.json()
    
    // Track fallback usage
    let usedFallback = false

    // Validate required fields
    if (!personalInfo.fullName || !personalInfo.email || !jobDescription) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, and job description are required" },
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

    // Enhanced Resume Prompt for Modern Designer
    const resumePrompt = `
You are an expert resume writer. Create a professional, ATS-optimized resume for Tishbian Meshach S based on the following information:

CANDIDATE PROFILE:
- Name: ${personalInfo.fullName}
- Email: ${personalInfo.email}
- Phone: ${personalInfo.phone}
- Location: ${personalInfo.location}
- LinkedIn: ${personalInfo.linkedIn}
- Portfolio: ${personalInfo.portfolio}
- Summary: ${personalInfo.summary}
- Skills: ${personalInfo.skills}
- Experience: ${personalInfo.experience}
- Education: ${personalInfo.education}
- Current Certifications: ${personalInfo.certifications} (Use these as a reference, but generate new relevant certifications based on job requirements)

TARGET JOB DESCRIPTION:
${jobDescription}

SPECIAL FOCUS AREAS:
1. Modern Design Skills: Highlight expertise in current design tools, workflows, and automation (mention AI only when truly relevant)
2. Design Internship Optimization: Tailor for entry-level design positions and internships
3. Technical + Creative Balance: Showcase both technical skills and creative abilities (adjust based on job requirements)
4. Quantifiable Impact: Emphasize productivity improvements and efficiency gains through modern tools and processes
5. Industry-Standard Tools: Focus on current industry-standard design tools and innovative approaches

DYNAMIC SOFTWARE/TOOLS SELECTION (CORE COMPETENCIES):
Analyze the job description and dynamically select relevant tools. DO NOT include irrelevant tools:

FOR PURE DESIGN ROLES (UI/UX, Graphic Design, Visual Design):
- Design Tools: Figma, Adobe Creative Suite (Photoshop, Illustrator, InDesign, After Effects), Sketch, Framer, Spline, Rive
- Prototyping: Framer, ProtoPie, Principle, Lottie, Marvel, InVision
- Collaboration: Figma, Miro, FigJam, Notion, Slack, Asana
- Motion Graphics: After Effects, Rive, Lottie, Spline, LottieFiles
- 3D/AR: Spline, Blender, Cinema 4D, Reality Composer (if relevant)
- AI Design Tools: Midjourney, Stable Diffusion, Runway ML (if mentioned in job)
- EXCLUDE: React, HTML, CSS, Tailwind, JavaScript, TypeScript (unless frontend development is explicitly required)

FOR DESIGN + FRONTEND ROLES (Frontend Designer, Design Engineer):
- Include both design tools AND development tools
- Design: Figma, Adobe Creative Suite, Framer, Spline, Rive
- Development: React, HTML, CSS, Tailwind, JavaScript, TypeScript
- Design Systems: Storybook, Figma Tokens, Style Dictionary

FOR GRAPHIC DESIGN ROLES:
- Adobe Creative Suite: Photoshop, Illustrator, InDesign, After Effects, Premiere Pro
- Print Design: InDesign, Acrobat Pro, Pantone Color System
- Brand Design: Illustrator, Photoshop, Brand Guidelines
- Motion Graphics: After Effects, Cinema 4D, Lottie

FOR PRODUCT DESIGN ROLES:
- Design: Figma, Sketch, Adobe XD, Framer, Spline, Rive
- Research: Maze, Hotjar, UserTesting, Miro, Optimal Workshop, Lookback
- Analytics: Google Analytics, Mixpanel, Amplitude, Hotjar, FullStory
- Prototyping: Framer, ProtoPie, Principle, Marvel, InVision
- Product Tools: Notion, Linear, Jira, Productboard, Airtable

FOR WEB DESIGN ROLES:
- Design: Figma, Adobe Creative Suite, Framer, Spline
- Web-specific: Webflow, WordPress, Squarespace (if relevant)
- May include: HTML, CSS (if frontend coding is mentioned)

TOOL SELECTION RULES:
1. Always include Figma as the primary design tool for all design roles
2. Add Framer, Spline, Rive for modern interactive design capabilities
3. Include Adobe Creative Suite tools based on job requirements:
   - UI/UX: Photoshop, Illustrator, After Effects
   - Graphic Design: Full Creative Suite (Photoshop, Illustrator, InDesign, After Effects, Premiere Pro)
   - Motion Design: After Effects, Premiere Pro, Cinema 4D
4. ONLY include development tools (React, HTML, CSS, Tailwind, JavaScript, TypeScript) if job explicitly requires frontend coding or mentions "frontend designer" or "design engineer"
5. Maximum 6 tools per category in Core Competencies
6. Prioritize tools mentioned in job description first
7. Focus on current industry-standard tools
8. For AI-related roles: Include AI design tools (Midjourney, Stable Diffusion, Runway ML)
9. For motion design roles: Prioritize After Effects, Rive, Lottie, Spline
10. For research-heavy roles: Include user research tools (UserTesting, Maze, Hotjar)
11. Avoid outdated tools unless specifically mentioned in job description

ATS KEYWORD OPTIMIZATION STRATEGY:
1. ANALYZE JOB DESCRIPTION FIRST:
   - Extract ALL technical skills, tools, and technologies mentioned
   - Identify required qualifications and preferred experience
   - Note specific industry terminology and buzzwords
   - Find company-specific language and values
   - Identify years of experience requirements
   - Extract soft skills and competencies mentioned

2. KEYWORD INTEGRATION RULES:
   - Use EXACT spelling and capitalization from job description
   - Include skill variations (e.g., "UI/UX" vs "User Experience Design")
   - Match technology versions if specified (e.g., "React 18" vs "React")
   - Use industry acronyms and full forms as mentioned
   - Include certification names exactly as written
   - Mirror job title terminology in experience descriptions

3. CONTENT CUSTOMIZATION BY ROLE:
   - Startup roles: Emphasize versatility, fast-paced environment, innovation
   - Enterprise roles: Focus on scalability, collaboration, process improvement
   - Agency roles: Highlight client work, diverse projects, tight deadlines
   - Product roles: Emphasize user-centered design, data-driven decisions
   - Consulting roles: Focus on problem-solving, strategic thinking

4. INDUSTRY-SPECIFIC LANGUAGE:
   - Healthcare: HIPAA, patient experience, accessibility, regulatory compliance
   - Fintech: Security, compliance, data privacy, financial regulations
   - E-commerce: Conversion optimization, user journey, checkout experience
   - SaaS: User onboarding, retention, subscription models, dashboard design
   - Gaming: Player experience, engagement, monetization, user acquisition

CORE COMPETENCIES EXAMPLES (ULTRA-COMPACT ONE-LINE FORMAT):

Example for UI/UX Designer Role:
**Design Software:** Figma, Framer, Spline, Rive, Photoshop
**Design Skills:** User Research, Prototyping, Design Systems, Interaction Design
**Industry Knowledge:** SaaS Design, Mobile UX, Accessibility Standards, Agile Process
**Additional Skills:** Project Management, Cross-functional Collaboration, Data Analysis

Example for Graphic Designer Role:
**Design Software:** Adobe Creative Suite, Photoshop, Illustrator, InDesign, Figma
**Design Skills:** Brand Identity, Print Design, Typography, Layout Design
**Industry Knowledge:** Print Production, Brand Guidelines, Marketing Design
**Additional Skills:** Client Communication, Creative Direction, Asset Management

Example for Motion Designer Role:
**Design Software:** After Effects, Rive, Spline, Lottie, Cinema 4D
**Design Skills:** Motion Graphics, Animation, Storyboarding, 3D Design
**Industry Knowledge:** Video Production, Brand Animation, UI Animation
**Additional Skills:** Creative Direction, Video Editing, Sound Design

Example for Frontend Designer Role:
**Design Software:** Figma, Adobe Creative Suite, Framer, Spline, Rive
**Development Tools:** React, HTML, CSS, Tailwind, JavaScript
**Design Skills:** Design Systems, Component Design, Responsive Design
**Additional Skills:** Git, Storybook, API Integration, Performance Optimization

CRITICAL: Each competency category MUST be on exactly ONE LINE with format "**Category:** Item1, Item2, Item3, Item4"

SINGLE-PAGE RESUME REQUIREMENTS (ULTRA COMPACT - CRITICAL FOR GEMINI 2.5 PRO):
1. Use standard section headers: CONTACT INFORMATION, PROFESSIONAL SUMMARY, CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS
2. Professional Summary: Maximum 2-3 lines only - MUST include exact keywords from job description and mirror the required experience level, skills, and industry focus
3. Core Competencies: EXACTLY 4 categories, each category on ONE LINE ONLY in format "Category: Tool1, Tool2, Tool3, Tool4":
   - Design Software: (4-5 tools max - prioritize based on job description)
   - Design Skills: (4-5 skills like User Research, Prototyping, Design Systems)
   - Industry Knowledge: (3-4 items relevant to the specific industry)
   - Additional Skills: (3-4 complementary skills like Project Management, Collaboration)
4. Professional Experience: EXACTLY 2 bullet points per job, each bullet MUST be 1 line only, NO LOCATION FIELD
5. Projects: ONLY 2 projects, maximum 2 bullet points each (1 line each)
6. Education: Single line format only
7. Certifications: Generate 3-4 relevant certifications based on job requirements - use industry-standard certifications that would be valuable for this specific role

CRITICAL SPACING REQUIREMENTS FOR GEMINI 2.5 PRO:
- NO extra blank lines between sections
- NO extra spacing within sections
- NO line breaks within bullet points
- MAXIMUM 1 line per bullet point
- MAXIMUM 1 line per competency category
- MAXIMUM 3 lines for professional summary
- ULTRA-COMPACT formatting to fit ONE PAGE ONLY
8. ATS OPTIMIZATION - CRITICAL FOR SUCCESS:
   - Extract and use EXACT keywords from job description (skills, tools, technologies, requirements)
   - Mirror job description language and terminology precisely
   - Include industry-specific buzzwords and phrases from the posting
   - Use exact skill names as they appear in job description
   - Match job title variations and related terms
   - Include required qualifications using same wording
   - Use department/team names mentioned in job posting
   - Include company values/culture keywords if mentioned
9. Use action verbs: Led, Designed, Implemented, Enhanced, Developed, Created, Optimized
10. Focus on measurable achievements with specific numbers
11. Remove ALL verbose explanations - every word must be essential

PROFESSIONAL EXPERIENCE FORMAT (ATS-OPTIMIZED):
- Use this exact format: **Job Title | Company Name | Dates**
- Example: **Leading Designer | TripXplo | 2022 - Present**
- NO LOCATION FIELD - removes unnecessary space
- Follow with bullet points starting with "* " for achievements
- This compact format saves significant vertical space compared to separate lines

EXPERIENCE CUSTOMIZATION REQUIREMENTS:
- ADAPT job responsibilities to match the target job description
- Use EXACT keywords from job posting in achievement descriptions
- Emphasize relevant experience that matches job requirements
- Include specific technologies/tools mentioned in job description
- Match the seniority level language (junior, senior, lead, etc.)
- Use company/industry terminology from the job posting
- Highlight achievements that align with job's key responsibilities

IMPORTANT FORMATTING RULES:
- Job titles: **Job Title | Company Name | Location | Dates** (no leading bullet)
- Achievement bullets: * Achievement description (with leading asterisk and space)
- Project titles: **Project Name: Brief Description** (no leading bullet)
- Project bullets: * Project achievement (with leading asterisk and space)

PROJECTS SECTION REQUIREMENTS (ATS-OPTIMIZED):
- Generate EXACTLY 2 projects that DIRECTLY match job description requirements
- Format: "**Project Name: Brief Description**"
- Maximum 2 bullet points per project, each bullet 1 line only
- Focus on quantifiable results and key technologies FROM THE JOB DESCRIPTION
- Make project names specific to the industry/role mentioned in job posting
- NO placeholder text, brackets, or "[Client Name]"
- NO instructions or notes in final output
- Ultra-concise, impactful statements only

PROJECT CUSTOMIZATION STRATEGY:
1. ANALYZE job description for specific project types mentioned
2. CREATE projects that demonstrate EXACT skills required in job posting
3. USE same technologies, tools, and methodologies mentioned in job description
4. MATCH project scope to company size and industry (startup vs enterprise)
5. INCLUDE industry-specific metrics and KPIs mentioned in job posting
6. EMPHASIZE collaboration methods mentioned (Agile, Scrum, Design Sprints)
7. SHOW results that align with job's success metrics

EXAMPLE - SaaS dashboard:
**Analytics Dashboard: Data Visualization Platform**
* Designed enterprise dashboard for 10,000+ users, reducing task completion time by 45%
* Created interactive data visualization components with real-time updates

EXAMPLE - Healthcare:
**Telehealth Platform: Patient Communication System**
* Designed HIPAA-compliant video consultation interface for 5,000+ patients
* Created appointment scheduling system reducing no-show rates by 30%

UNIQUE VALUE PROPOSITIONS (CONCISE):
- Combines design expertise with automation capabilities
- Proven 60% productivity increase through workflow optimization
- Expert in modern design tools and technologies
- Data-driven design validation and user research experience

LANGUAGE GUIDELINES (SINGLE PAGE):
- Use "AI" strategically in competencies and certifications only
- Avoid excessive AI prefixes - focus on results and outcomes
- Emphasize productivity and measurable improvements with specific numbers
- Use natural, professional language - keep descriptions brief and impactful
- Remove verbose explanations - every word must add value

CRITICAL: PROJECTS MUST BE JOB-SPECIFIC (CONCISE):
- Create 2 industry-specific projects based on job description
- AVOID generic "e-commerce website redesign" projects
- Healthcare: patient portals, telehealth apps, medical dashboards
- Fintech: trading platforms, digital wallets, investment apps
- Gaming: game UI/UX, player onboarding, analytics
- SaaS: complex dashboards, user onboarding, data visualization
- Education: learning management systems, educational apps
- Projects must demonstrate domain expertise in brief, impactful statements

ULTRA-COMPACT ATS-OPTIMIZED RESUME GENERATION:
1. THOROUGHLY analyze job description for keywords, requirements, and company culture
2. EXTRACT and integrate exact terminology from job posting throughout resume
3. CREATE 2 industry-specific projects that match job requirements precisely
4. CUSTOMIZE professional summary to mirror job description language
5. ADAPT experience bullets to highlight relevant skills from job posting
6. MATCH core competencies to job requirements (skills, tools, experience level)
7. EXACTLY 2 bullet points per job (1 line each) - focus on job-relevant achievements
8. Maximum 2 bullet points per project (1 line each) - demonstrate required skills
9. Focus on measurable results using metrics relevant to the industry
10. Remove ALL unnecessary words - every word must serve ATS optimization

ATS SCANNING OPTIMIZATION:
- Use standard section headers (no creative variations)
- Include exact keywords from job description multiple times naturally
- Match skill names exactly as written in job posting
- Use industry-standard terminology throughout
- Avoid graphics, tables, or complex formatting
- Ensure consistent formatting for easy parsing

CERTIFICATION GENERATION REQUIREMENTS:
Instead of using the provided certifications, generate 3-4 relevant, industry-standard certifications that would be valuable for this specific role:

FOR UI/UX DESIGN ROLES:
- Google UX Design Certificate
- Adobe Certified Expert (ACE) in relevant software
- Figma Certified Professional
- Nielsen Norman Group UX Certification
- Human-Computer Interaction (HCI) certifications
- Agile/Scrum certifications if mentioned in job description

FOR GRAPHIC DESIGN ROLES:
- Adobe Certified Expert (ACE) in Creative Suite
- Brand Design certifications
- Print Production certifications
- Typography certifications
- Color management certifications

FOR PRODUCT DESIGN ROLES:
- Product Design certifications
- Design Thinking certifications
- Lean UX certifications
- User Research certifications
- Google Design Sprint certification

FOR TECHNICAL/FRONTEND DESIGN ROLES:
- Frontend development certifications (if coding is required)
- Design system certifications
- Web accessibility certifications
- Performance optimization certifications

FOR AI/EMERGING TECH ROLES:
- AI in Design certifications
- Prompt engineering certifications
- Generative AI certifications
- Machine learning for designers

CERTIFICATION SELECTION RULES:
1. Analyze job description for required/preferred certifications
2. Include certifications that match the company's tech stack
3. Prioritize Google, Adobe, and industry-leader certifications
4. Include accessibility certifications for inclusive design roles
5. Add agile/scrum certifications for collaborative environments
6. Include analytics certifications for data-driven design roles
7. Choose certifications that demonstrate commitment to professional development
8. Ensure certifications are current and industry-recognized
9. Match certification level to job seniority (entry-level vs advanced)
10. Include specialized certifications for niche industries (healthcare, fintech, etc.)

FINAL FORMATTING REQUIREMENTS FOR GEMINI 2.5 PRO:
1. CORE COMPETENCIES: Use bullet points (•) and ensure each category is exactly ONE LINE
2. PROFESSIONAL EXPERIENCE: Format as "**Job Title | Company Name | Dates**" (NO LOCATION)
3. NO blank lines between bullet points
4. NO extra spacing anywhere
5. Maximum 4-5 tools per competency category
6. All bullet points must be exactly 1 line
7. Professional summary maximum 3 lines
8. Total resume must fit on ONE PAGE ONLY

Generate a complete, professional, ULTRA-COMPACT SINGLE-PAGE resume with ALL sections properly filled:
- CONTACT INFORMATION (header)
- PROFESSIONAL SUMMARY (2-3 lines)
- CORE COMPETENCIES (4 categories, each 1 line)
- PROFESSIONAL EXPERIENCE (2 jobs, 2 bullets each)
- PROJECTS (2 projects, 2 bullets each)
- EDUCATION (1 line)
- CERTIFICATIONS (3-4 relevant ones)

The resume must pass ATS scanning and position Tishbian as the ideal candidate for this exact role. CRITICAL: Include ALL resume sections with proper content.
`

    // Enhanced Cover Letter Prompt - Main Content Paragraph Only
    const coverLetterPrompt = `
You are an expert cover letter writer specializing in creating compelling, human-centered content for design professionals. Create a single, powerful main paragraph that captures the essence of why this candidate is perfect for the role.

CANDIDATE PROFILE:
- Name: ${personalInfo.fullName}
- Email: ${personalInfo.email}
- Phone: ${personalInfo.phone}
- Location: ${personalInfo.location}
- LinkedIn: ${personalInfo.linkedIn}
- Portfolio: ${personalInfo.portfolio}
- Summary: ${personalInfo.summary}
- Skills: ${personalInfo.skills}
- Experience: ${personalInfo.experience}
- Education: ${personalInfo.education}
- Current Certifications: ${personalInfo.certifications} (Reference only - focus on experience and skills)

TARGET JOB DESCRIPTION:
${jobDescription}

MAIN PARAGRAPH REQUIREMENTS:
1. Write ONLY the main content paragraph - no salutation, no formal letter structure, no closing
2. Create a compelling, conversational paragraph that feels genuine and human
3. Length: 4-6 sentences that flow naturally together
4. Tone: Authentic, enthusiastic, and personable - like speaking to a friend who works at the company
5. Focus on personal connection and genuine interest in the role
6. Avoid corporate jargon and overly formal language
7. Show personality while maintaining professionalism

CONTENT FOCUS:
- Express genuine excitement about the specific role and company
- Highlight relevant experience and achievements in a natural, storytelling way
- Connect personal skills and interests to the job requirements
- Mention specific aspects of the company or role that genuinely appeal to you
- Show how your background makes you uniquely suited for this position
- Include a brief, authentic insight about your design philosophy or approach

WRITING STYLE:
- Use active voice and varied sentence structure
- Include specific examples that demonstrate impact
- Show passion for design and the company's mission
- Be conversational but professional
- Avoid buzzwords and clichés
- Make it feel like a genuine person is writing, not a robot

UNIQUE SELLING POINTS TO WEAVE IN NATURALLY:
- 4+ years of design experience combined with student perspective
- Leading designer role at TripXplo with measurable impact
- Expertise in modern design tools and AI-enhanced workflows
- 100+ successful freelance projects showing versatility
- Combination of technical skills with creative abilities
- Passion for user-centered design and innovation

Create a single, engaging paragraph that makes the hiring manager want to meet this person - someone who brings both proven experience and fresh energy, with a genuine passion for design and the specific company/role.
`

    console.log("Extracting company name from job description...")

    // Extract company name using Gemini AI
    const companyNamePrompt = `
Extract the company name from this job description. Return ONLY the company name, nothing else.

Job Description:
${jobDescription}

Instructions:
1. Look for the company name in the job posting
2. Return only the company name (e.g., "Google", "Microsoft", "Apple")
3. If multiple companies are mentioned, return the hiring company
4. If no company name is found, return "Company"
5. Do not include "Inc.", "LLC", "Corp.", or other suffixes unless part of the brand name
6. Return exactly one word or phrase that represents the company name
`

    const companyNameResponse = await generateWithGemini(companyNamePrompt, selectedModel)
    const companyName = companyNameResponse.result.trim()
    if (companyNameResponse.usedFallback) usedFallback = true

    console.log("Generating AI-enhanced resume with Gemini...")

    // Generate resume
    const resumeResponse = await generateWithGemini(resumePrompt, selectedModel)
    if (resumeResponse.usedFallback) usedFallback = true
    
    // Clean up any remaining instructional text
    const cleanedResume = cleanResumeContent(resumeResponse.result)
    
    // Debug: Check if resume content is actually generated
    if (!cleanedResume || cleanedResume.length < 100) {
      console.error("Resume generation failed or produced minimal content")
      console.log("Resume result:", resumeResponse.result)
      throw new Error("Resume generation failed - insufficient content")
    }

    console.log("Generating personalized cover letter with Gemini...")

    // Generate cover letter
    const coverLetterResponse = await generateWithGemini(coverLetterPrompt, selectedModel)
    if (coverLetterResponse.usedFallback) usedFallback = true

    console.log("AI-enhanced content generation completed successfully")

    return NextResponse.json({
      resume: cleanedResume,
      coverLetter: coverLetterResponse.result,
      companyName: companyName,
      usedFallback: usedFallback,
    })
  } catch (error) {
    console.error("Error generating content:", error)

    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes("API key") || error.message.includes("401")) {
        return NextResponse.json(
          { error: "Invalid API key. Please check your Google AI API key configuration." },
          { status: 401 },
        )
      }
      if (error.message.includes("quota") || error.message.includes("429")) {
        return NextResponse.json({ error: "API quota exceeded. Please try again later." }, { status: 429 })
      }
      if (error.message.includes("400")) {
        return NextResponse.json({ error: "Invalid request format. Please try again." }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Failed to generate content. Please try again." }, { status: 500 })
  }
}
