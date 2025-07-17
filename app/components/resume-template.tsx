"use client"

import { forwardRef } from "react"
import type { JSX } from "react"

interface ResumeTemplateProps {
  resumeContent: string
  personalInfo: {
    fullName: string
    email: string
    phone: string
    location: string
    linkedIn: string
    portfolio: string
  }
}

const formatTextWithMarkdown = (text: string) => {
  // Start with the original text
  let cleanedText = text
  
  // Remove leading bullet characters (•, *, etc.) but preserve ** for bold formatting
  cleanedText = cleanedText.replace(/^(\s*[•]\s*)/, "")
  cleanedText = cleanedText.replace(/^(\s*\*\s+)/, "") // Remove "* " (asterisk followed by space)
  
  // Handle complex patterns like "•**UI/UX Design:** **"
  cleanedText = cleanedText.replace(/\*\*([^*]+?):\*\*\s*\*\*\s*(.*)$/, "<strong>$1:</strong> $2")
  
  // Handle standard bold formatting: **text** to <strong>text</strong>
  cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  
  // Handle patterns like "**text:** content"
  cleanedText = cleanedText.replace(/\*\*([^*]+?):\*\*\s*(.*)$/, "<strong>$1:</strong> $2")
  
  // Handle single asterisk at the beginning of lines (like "* UI/UX Design:")
  cleanedText = cleanedText.replace(/^\*\s*(.+?):\s*(.*)$/, "<strong>$1:</strong> $2")
  
  // Handle remaining single asterisks that might be used for emphasis
  cleanedText = cleanedText.replace(/\*([^*]+)\*/g, "<em>$1</em>")
  
  // Clean up any remaining double asterisks AFTER all processing
  cleanedText = cleanedText.replace(/\*\*/g, "")
  
  // Remove stray single asterisks at the beginning of lines that aren't followed by a space
  cleanedText = cleanedText.replace(/^\*([A-Za-z])/, "$1")
  
  return cleanedText
}

const ResumeTemplate = forwardRef<HTMLDivElement, ResumeTemplateProps>(({ resumeContent, personalInfo }, ref) => {
  // Parse the AI-generated resume content into structured sections
  const parseResumeContent = (content: string) => {
    const sections: { [key: string]: string[] } = {}
    const lines = content.split("\n").filter((line) => line.trim())

    let currentSection = ""
    let currentContent: string[] = []

    lines.forEach((line) => {
      const trimmedLine = line.trim()

      // Check if line is a section header (look for common section headers)
      if (
        trimmedLine.includes("CONTACT") ||
        trimmedLine.includes("SUMMARY") ||
        trimmedLine.includes("COMPETENCIES") ||
        trimmedLine.includes("SKILLS") ||
        trimmedLine.includes("EXPERIENCE") ||
        trimmedLine.includes("PROJECTS") ||
        trimmedLine.includes("EDUCATION") ||
        trimmedLine.includes("CERTIFICATIONS")
      ) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = [...currentContent]
        }
        // Clean up section header
        currentSection = trimmedLine.replace(/^\*\*|\*\*$/g, "").replace(/[^\w\s]/g, "").trim().toUpperCase()
        currentContent = []
      } else if (trimmedLine && currentSection) {
        // Skip lines that are just formatting artifacts
        if (!trimmedLine.match(/^[\*\-\=\s]*$/)) {
          currentContent.push(trimmedLine)
        }
      }
    })

    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent
    }

    return sections
  }

  const sections = parseResumeContent(resumeContent)

  return (
    <div ref={ref} className="bg-white p-4 max-w-4xl mx-auto" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header Section */}
      <div className="text-center pb-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{personalInfo.fullName}</h1>
        <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-600">
          <span>{personalInfo.email}</span>
          <span>•</span>
          <span>{personalInfo.phone}</span>
          <span>•</span>
          <span>{personalInfo.location}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm text-blue-600 mt-1">
          {personalInfo.linkedIn && (
            <>
              <span>{personalInfo.linkedIn}</span>
              <span>•</span>
            </>
          )}
          {personalInfo.portfolio && <span>{personalInfo.portfolio}</span>}
        </div>
      </div>

      {/* Professional Summary */}
      {sections["PROFESSIONAL SUMMARY"] && (
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">PROFESSIONAL SUMMARY</h2>
          <div className="text-sm text-gray-700 leading-tight">
            {sections["PROFESSIONAL SUMMARY"].map((line, index) => (
              <p key={index} className="mb-1" dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(line) }} />
            ))}
          </div>
        </div>
      )}

      {/* Core Competencies */}
      {(sections["CORE COMPETENCIES"] || sections["SKILLS"]) && (
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">CORE COMPETENCIES</h2>
          <div className="text-sm text-gray-700">
            {(sections["CORE COMPETENCIES"] || sections["SKILLS"]).map((line, index) => {
              const trimmedLine = line.trim()
              // Check if this is a bullet point that starts with • or *
              if (trimmedLine.startsWith("•") || trimmedLine.startsWith("*")) {
                return (
                  <div key={index} className="mb-1 flex">
                    <span className="mr-1">•</span>
                    <span dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(trimmedLine) }} />
                  </div>
                )
              } else {
                return (
                  <div key={index} className="mb-1" dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(line) }} />
                )
              }
            })}
          </div>
        </div>
      )}

      {/* Professional Experience */}
      {sections["PROFESSIONAL EXPERIENCE"] && (
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">
            PROFESSIONAL EXPERIENCE
          </h2>
          <div className="text-sm text-gray-700">
            {(() => {
              const elements: JSX.Element[] = []
              let currentJobBullets: string[] = []
              let currentJobHeader: JSX.Element | null = null

              const renderCurrentJob = () => {
                if (currentJobHeader) {
                  elements.push(currentJobHeader)
                  if (currentJobBullets.length > 0) {
                    elements.push(
                      <ul key={`bullets-${elements.length}`} className="list-disc pl-4 mb-2">
                        {currentJobBullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className="mb-0.5" dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(bullet) }} />
                        ))}
                      </ul>,
                    )
                  }
                  currentJobBullets = []
                  currentJobHeader = null
                }
              }

              sections["PROFESSIONAL EXPERIENCE"].forEach((line, index) => {
                const trimmedLine = line.trim()
                
                // Check if this is a job header (contains | OR starts with **)
                // Handle both formats: "**Job Title | Company | Location | Dates**" and "* **Job Title | Company | Location | Dates**"
                const isJobHeader = trimmedLine.includes("|") || 
                                   (trimmedLine.startsWith("**") && !trimmedLine.match(/^\*\*[A-Z]+\s*(Skills|Software|Knowledge|Additional):/))
                
                if (isJobHeader) {
                  // This is a new job title line
                  renderCurrentJob() // Render previous job if any

                  if (trimmedLine.includes("|")) {
                    // Format: "**Job Title | Company | Location | Dates**" or "* **Job Title | Company | Location | Dates**"
                    // Clean up the line first
                    const cleanedLine = trimmedLine.replace(/^\*\s*/, "").replace(/^\*\*|\*\*$/g, "")
                    const parts = cleanedLine.split("|")
                    const jobTitle = parts[0]?.trim() || ""
                    const company = parts[1]?.trim() || ""
                    const location = parts[2]?.trim() || ""
                    const dates = parts[3]?.trim() || ""
                    
                    // Combine company and dates for right side
                    // If we have 4 parts, show company and dates on right
                    // If we have 3 parts, show company and location/dates on right
                    let rightSide = ""
                    if (parts.length >= 4) {
                      rightSide = [company, dates].filter(Boolean).join(" | ")
                    } else if (parts.length === 3) {
                      rightSide = [company, location].filter(Boolean).join(" | ")
                    } else if (parts.length === 2) {
                      rightSide = company
                    }
                    
                    currentJobHeader = (
                      <div key={`job-header-${index}`} className="mb-1 mt-2">
                        <div className="flex justify-between items-start">
                          <div
                            className="font-semibold text-gray-800"
                            dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(jobTitle) }}
                          />
                          <div
                            className="text-gray-600 text-right"
                            dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(rightSide) }}
                          />
                        </div>
                        {parts.length >= 4 && location && (
                          <div
                            className="text-gray-600"
                            dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(location) }}
                          />
                        )}
                      </div>
                    )
                  } else {
                    // Format: "**Job Title**" as a standalone line
                    currentJobHeader = (
                      <div key={`job-header-${index}`} className="mb-1 mt-2">
                        <div
                          className="font-semibold text-gray-800"
                          dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(trimmedLine) }}
                        />
                      </div>
                    )
                  }
                } else if (trimmedLine.startsWith("•") || trimmedLine.startsWith("* ")) {
                  // This is a bullet point
                  currentJobBullets.push(trimmedLine)
                } else if (trimmedLine && !trimmedLine.match(/^[\*\-\=\s]*$/)) {
                  // This might be a continuation of a bullet or a paragraph within a job
                  // If we have a job header but no company info yet, treat this as company/location
                  if (currentJobHeader && currentJobBullets.length === 0) {
                    // This is likely company name or location info
                    const headerDiv = currentJobHeader.props.children
                    const updatedHeader = (
                      <div key={`job-header-${index}`} className="mb-3 mt-4">
                        {headerDiv}
                        <div
                          className="text-gray-600"
                          dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(trimmedLine) }}
                        />
                      </div>
                    )
                    currentJobHeader = updatedHeader
                  } else {
                    currentJobBullets.push(trimmedLine)
                  }
                }
              })
              renderCurrentJob() // Render the last job
              return elements
            })()}
          </div>
        </div>
      )}

      {/* Projects */}
      {(sections["KEY PROJECTS"] || sections["PROJECTS"]) && (
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">KEY PROJECTS</h2>
          <div className="text-sm text-gray-700">
            {(() => {
              const projectSection = sections["KEY PROJECTS"] || sections["PROJECTS"]
              const elements: JSX.Element[] = []
              let currentProjectBullets: string[] = []
              let currentProjectHeader: JSX.Element | null = null

              const renderCurrentProject = () => {
                if (currentProjectHeader) {
                  elements.push(currentProjectHeader)
                  if (currentProjectBullets.length > 0) {
                    elements.push(
                      <ul key={`project-bullets-${elements.length}`} className="list-disc pl-4 mb-2">
                        {currentProjectBullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className="mb-0.5" dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(bullet) }} />
                        ))}
                      </ul>,
                    )
                  }
                  currentProjectBullets = []
                  currentProjectHeader = null
                }
              }

              projectSection.forEach((line, index) => {
                const trimmedLine = line.trim()
                
                // Check if this is a project header (contains : or starts with **)
                // Handle both formats: "**Project: Description**" and "* **Project: Description**"
                const isProjectHeader = trimmedLine.includes(":") || 
                                       (trimmedLine.startsWith("**") && !trimmedLine.match(/^\*\*[A-Z]+\s*(Skills|Software|Knowledge|Additional):/))
                
                if (isProjectHeader) {
                  // This is a new project title line
                  renderCurrentProject() // Render previous project if any

                  // Clean up the line first
                  const cleanedProjectLine = trimmedLine.replace(/^\*\s*/, "")
                  
                  currentProjectHeader = (
                    <div key={`project-header-${index}`} className="mb-1 mt-2">
                      <div
                        className="font-semibold text-gray-800"
                        dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(cleanedProjectLine) }}
                      />
                    </div>
                  )
                } else if (trimmedLine.startsWith("•") || trimmedLine.startsWith("* ")) {
                  // This is a bullet point
                  currentProjectBullets.push(trimmedLine)
                } else if (trimmedLine && !trimmedLine.match(/^[\*\-\=\s]*$/)) {
                  // This might be a continuation of a bullet or a paragraph within a project
                  // If no project header yet, treat this as a simple project description
                  if (!currentProjectHeader) {
                    currentProjectHeader = (
                      <div key={`project-header-${index}`} className="mb-1 mt-2">
                        <div
                          className="font-semibold text-gray-800"
                          dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(trimmedLine) }}
                        />
                      </div>
                    )
                  } else {
                    currentProjectBullets.push(trimmedLine)
                  }
                }
              })
              renderCurrentProject() // Render the last project
              return elements
            })()}
          </div>
        </div>
      )}

      {/* Education */}
      {sections["EDUCATION"] && (
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">EDUCATION</h2>
          <div className="text-sm text-gray-700">
            {sections["EDUCATION"].map((line, index) => {
              return (
                <div key={index} className="mb-1">
                  {line.includes("|") ? (
                    <div>
                      {line.split("|").map((part, partIndex) => (
                        <div key={partIndex} className={partIndex === 0 ? "font-semibold" : "text-gray-600"}>
                          <span dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(part.trim()) }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <span dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(line) }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Certifications */}
      {sections["CERTIFICATIONS"] && (
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">CERTIFICATIONS</h2>
          <div className="text-sm text-gray-700">
            {sections["CERTIFICATIONS"].map((line, index) => {
              const trimmedLine = line.trim()
              // Check if this is a bullet point that starts with • or *
              if (trimmedLine.startsWith("•") || trimmedLine.startsWith("*")) {
                return (
                  <div key={index} className="mb-0.5 flex">
                    <span className="mr-1">•</span>
                    <span dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(trimmedLine) }} />
                  </div>
                )
              } else {
                return (
                  <div key={index} className="mb-0.5" dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(line) }} />
                )
              }
            })}
          </div>
        </div>
      )}
    </div>
  )
})

ResumeTemplate.displayName = "ResumeTemplate"

export default ResumeTemplate
export { ResumeTemplate }
