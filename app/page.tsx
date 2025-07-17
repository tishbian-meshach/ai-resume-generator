"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, FileText, User, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProfileSummary } from "./components/profile-summary"
import { ProfilePopup } from "./components/profile-popup"
import { ResultsDisplay } from "./components/results-display"

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

interface GeneratedContent {
  resume: string
  coverLetter: string
}

export default function ResumeGenerator() {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: "Tishbian Meshach S",
    email: "tishbianmeshach@gmail.com",
    phone: "+91 7339258486",
    location: "Tuticorin, Tamil Nadu, India",
    linkedIn: "https://linkedin.com/in/tishbian-meshach",
    portfolio: "https://tishbian.vercel.app",
    summary:
      "Innovative UI/UX Designer and AI-Enhanced Graphic Designer with 4+ years of experience in creating user-centered designs and visual content. Expert in leveraging artificial intelligence and prompt engineering to optimize design workflows and enhance creative output. Currently pursuing Computer Science Engineering while leading design teams and pioneering AI-integrated design processes. Proven track record of increasing productivity by 60% through strategic AI implementation and automated design systems.",
    skills:
      "UI/UX Design, Graphic Design, Figma, Adobe Creative Suite, Adobe Photoshop, Adobe Illustrator, After Effects, Premiere Pro, React, JavaScript, HTML5, CSS3, Tailwind CSS, Prototyping, User Research, Usability Testing, Wireframing, Adobe XD, Sketch, Artificial Intelligence, AI-Powered Design, Prompt Engineering, ChatGPT, Claude, Gemini AI, Midjourney, DALL-E, Stable Diffusion, AI Workflow Automation, Design Process Optimization, AI Content Generation, Machine Learning for Design, AI-Assisted Prototyping, Automated Design Systems",
    experience: `Leading Designer | TripXplo | 2023 - Present | Full-time
• Lead design team in developing user-centred designs for web and mobile applications
• Conduct user research and usability testing to inform design decisions
• Create wireframes, prototypes, and high-fidelity designs using Sketch, Figma, and Adobe XD
• Implement AI-powered design workflows to enhance productivity by 60%
• Utilize prompt engineering to generate design concepts and user personas
• Integrate AI tools for automated design system creation and maintenance
• Collaborate with development teams using AI-assisted documentation
• Enhanced user engagement through AI-optimized UX design strategies
• Reduced design iteration time by 50% using AI-powered prototyping tools
• Successfully led cross-functional design projects with AI workflow integration

AI-Enhanced Freelance Graphic Designer | Self-Employed | 2019 - Present | Freelance
• Designed custom graphics and visual content for YouTubers and content creators
• Created thumbnails, banners, logos, and brand identity assets using AI-assisted workflows
• Developed automated design processes using prompt engineering techniques
• Managed multiple projects simultaneously with AI-powered project management
• Enhanced client brand identity through AI-generated design variations and A/B testing
• Utilized generative AI for rapid concept development and ideation
• Successfully completed 100+ design projects with 40% faster turnaround using AI
• Maintained 100% client satisfaction rate through AI-enhanced quality control
• Specialized in YouTube content creator branding with AI-optimized thumbnails
• Increased design output by 3x through strategic AI tool integration`,
    education:
      "Bachelor of Engineering (B.E) in Computer Science | University College of Engineering, Kanchipuram | 2022-2026 | Pursuing",
    certifications:
      "Google UX Design Certificate, Adobe Certified Expert (ACE), Figma Certified Professional",
  })

  const [jobDescription, setJobDescription] = useState("")
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const { toast } = useToast()

  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }))
  }

  const extractCompanyName = (jobDescription: string): string => {
    // Look for common patterns for company names
    const patterns = [
      /Company:\s*(.+)/i,
      /Organization:\s*(.+)/i,
      /(?:at|for|with|join)\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s+(?:is|are|we|our|the|looking|seeking|based|located))/i,
      /(?:^|\n)([A-Z][a-zA-Z\s&.,]+?)\s+is\s+(?:a|an|the|seeking|looking|hiring)/i,
      /(?:^|\n)([A-Z][a-zA-Z\s&.,]+?)\s+(?:seeks|wants|needs|requires)/i,
      /(?:Join|Work at|Career at|Position at|Role at|Opportunity at)\s+([A-Z][a-zA-Z\s&.,]+)/i,
      /(?:^|\n)([A-Z][a-zA-Z\s&.,]+?)\s+(?:team|company|organization)/i,
    ]
    
    for (const pattern of patterns) {
      const match = jobDescription.match(pattern)
      if (match && match[1]) {
        const companyName = match[1].trim()
        // Clean up common suffixes and prefixes
        const cleanedName = companyName
          .replace(/\s+(?:is|are|we|our|the|team|company|organization).*$/i, '')
          .replace(/[.,;:!?]+$/, '')
          .trim()
        
        if (cleanedName.length > 1 && cleanedName.length < 50) {
          return cleanedName
        }
      }
    }
    
    return ""
  }

  const generateContent = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Error",
        description: "Please paste a job description",
        variant: "destructive",
      })
      return
    }

    if (!personalInfo.fullName || !personalInfo.email) {
      toast({
        title: "Error",
        description: "Please fill in at least your name and email",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Extract company name from job description
    const extractedCompanyName = extractCompanyName(jobDescription)
    setCompanyName(extractedCompanyName)

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalInfo,
          jobDescription,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate content")
      }

      const data = await response.json()
      setGeneratedContent(data)

      toast({
        title: "Success!",
        description: "Resume and cover letter paragraph generated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Resume & Cover Letter Generator</h1>
          <p className="text-lg text-gray-600">
            Create ATS-friendly resumes and personalized cover letter paragraphs using Gemini AI
          </p>
        </div>

        {/* <ProfileSummary /> */}

        <div className="space-y-6">
          {/* Header with Profile Button */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span className="text-sm font-medium">Profile: {personalInfo.fullName}</span>
            </div>
            <ProfilePopup 
              personalInfo={personalInfo}
              onPersonalInfoChange={handlePersonalInfoChange}
            />
          </div>

          {/* Job Description Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Description
              </CardTitle>
              <CardDescription>Paste the job description to tailor your resume and cover letter paragraph</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here..."
                rows={10}
                className="w-full"
              />
              <Button onClick={generateContent} disabled={isLoading} className="w-full mt-4" size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Resume & Cover Letter Paragraph
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          {generatedContent ? (
            <ResultsDisplay 
              generatedContent={generatedContent}
              personalInfo={{
                fullName: personalInfo.fullName,
                email: personalInfo.email,
                phone: personalInfo.phone,
                location: personalInfo.location,
                linkedIn: personalInfo.linkedIn,
                portfolio: personalInfo.portfolio,
              }}
              companyName={companyName}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Ready to Generate Your Resume</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Make sure your profile is complete, then paste a job description above and click "Generate" to create your
                  customized resume and cover letter paragraph.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
