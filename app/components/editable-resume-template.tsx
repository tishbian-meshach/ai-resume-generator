"use client"

import { forwardRef, useState, useEffect, useImperativeHandle, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Edit3, Check, X, Plus, Trash2 } from "lucide-react"
import type { JSX } from "react"

export interface EditableResumeTemplateRef {
  closeAllEditing: () => void
  getHTMLContent: () => string | null
}

interface EditableResumeTemplateProps {
  resumeContent: string
  personalInfo: {
    fullName: string
    email: string
    phone: string
    location: string
    linkedIn: string
    portfolio: string
  }
  isEditing: boolean
  onContentChange?: (content: string) => void
  onPersonalInfoChange?: (personalInfo: any) => void
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

const EditableResumeTemplate = forwardRef<EditableResumeTemplateRef, EditableResumeTemplateProps>(
  ({ resumeContent, personalInfo, isEditing, onContentChange, onPersonalInfoChange }, ref) => {
    const [editablePersonalInfo, setEditablePersonalInfo] = useState(personalInfo)
    const [isEditingPersonal, setIsEditingPersonal] = useState(false)
    const [sections, setSections] = useState<{ [key: string]: string[] }>({})
    const [editingSections, setEditingSections] = useState<{ [key: string]: boolean }>({})
    const isUserEditingRef = useRef(false)
    const contentRef = useRef<HTMLDivElement>(null)

    // Parse the AI-generated resume content into structured sections
    const parseResumeContent = (content: string) => {
      const parsedSections: { [key: string]: string[] } = {}
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
            parsedSections[currentSection] = [...currentContent]
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
        parsedSections[currentSection] = currentContent
      }

      return parsedSections
    }

    useEffect(() => {
      setSections(parseResumeContent(resumeContent))
      // Only reset editing states when content changes from external source
      if (!isUserEditingRef.current) {
        setEditingSections({})
        setIsEditingPersonal(false)
      }
      // Reset the flag after processing
      isUserEditingRef.current = false
    }, [resumeContent])

    useEffect(() => {
      setEditablePersonalInfo(personalInfo)
    }, [personalInfo])

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      closeAllEditing: () => {
        setEditingSections({})
        setIsEditingPersonal(false)
      },
      getHTMLContent: () => {
        return contentRef.current?.innerHTML || null
      }
    }), [])

    const updateSectionContent = (sectionKey: string, newContent: string[]) => {
      const updatedSections = { ...sections, [sectionKey]: newContent }
      setSections(updatedSections)
      
      // Mark that this is a user-initiated change
      isUserEditingRef.current = true
      
      // Regenerate resume content
      if (onContentChange) {
        let newResumeContent = ''
        Object.entries(updatedSections).forEach(([key, content]) => {
          newResumeContent += `**${key}**\n`
          content.forEach(line => {
            newResumeContent += `${line}\n`
          })
          newResumeContent += '\n'
        })
        onContentChange(newResumeContent.trim())
      }
    }

    const toggleSectionEdit = (sectionKey: string) => {
      setEditingSections(prev => ({
        ...prev,
        [sectionKey]: !prev[sectionKey]
      }))
    }

    const updateLineContent = (sectionKey: string, lineIndex: number, newContent: string) => {
      const updatedContent = [...sections[sectionKey]]
      updatedContent[lineIndex] = newContent
      updateSectionContent(sectionKey, updatedContent)
    }

    const addLine = (sectionKey: string) => {
      const updatedContent = [...sections[sectionKey], '']
      updateSectionContent(sectionKey, updatedContent)
    }

    const removeLine = (sectionKey: string, lineIndex: number) => {
      const updatedContent = sections[sectionKey].filter((_, index) => index !== lineIndex)
      updateSectionContent(sectionKey, updatedContent)
    }

    const savePersonalInfo = () => {
      // Mark that this is a user-initiated change
      isUserEditingRef.current = true
      
      if (onPersonalInfoChange) {
        onPersonalInfoChange(editablePersonalInfo)
      }
      setIsEditingPersonal(false)
    }

    const cancelPersonalEdit = () => {
      setEditablePersonalInfo(personalInfo)
      setIsEditingPersonal(false)
    }

    const renderEditableSection = (sectionKey: string, sectionTitle: string, content: string[]) => {
      const isEditingThisSection = editingSections[sectionKey]

      return (
        <div className="mb-4 relative group">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">
              {sectionTitle}
            </h2>
            {isEditing && (
              <Button
                size="sm"
                variant="ghost"
                className={`opacity-0 group-hover:opacity-100 transition-opacity ${isEditingThisSection ? 'opacity-100' : ''}`}
                onClick={() => toggleSectionEdit(sectionKey)}
              >
                {isEditingThisSection ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {isEditingThisSection ? (
            <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
              {content.map((line, index) => (
                <div key={index} className="flex items-start gap-2">
                  {line.length > 60 ? (
                    <Textarea
                      value={line}
                      onChange={(e) => updateLineContent(sectionKey, index, e.target.value)}
                      className="flex-1 text-sm"
                      rows={Math.max(2, Math.ceil(line.length / 60))}
                    />
                  ) : (
                    <Input
                      value={line}
                      onChange={(e) => updateLineContent(sectionKey, index, e.target.value)}
                      className="flex-1 text-sm"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeLine(sectionKey, index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addLine(sectionKey)}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Line
                </Button>
                <Button
                  size="sm"
                  onClick={() => toggleSectionEdit(sectionKey)}
                  className="flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700 leading-tight">
              {content.map((line, index) => {
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
          )}
        </div>
      )
    }

    return (
      <div ref={contentRef} className="bg-white p-4 max-w-4xl mx-auto" style={{ fontFamily: "Arial, sans-serif" }}>
        {/* Header Section */}
        <div className="text-center pb-2 mb-4 relative group">
          {isEditingPersonal ? (
            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
              <Input
                value={editablePersonalInfo.fullName}
                onChange={(e) => setEditablePersonalInfo(prev => ({ ...prev, fullName: e.target.value }))}
                className="text-center text-xl font-bold"
                placeholder="Full Name"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={editablePersonalInfo.email}
                  onChange={(e) => setEditablePersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="text-sm"
                />
                <Input
                  value={editablePersonalInfo.phone}
                  onChange={(e) => setEditablePersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone"
                  className="text-sm"
                />
                <Input
                  value={editablePersonalInfo.location}
                  onChange={(e) => setEditablePersonalInfo(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Location"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={editablePersonalInfo.linkedIn}
                  onChange={(e) => setEditablePersonalInfo(prev => ({ ...prev, linkedIn: e.target.value }))}
                  placeholder="LinkedIn"
                  className="text-sm"
                />
                <Input
                  value={editablePersonalInfo.portfolio}
                  onChange={(e) => setEditablePersonalInfo(prev => ({ ...prev, portfolio: e.target.value }))}
                  placeholder="Portfolio"
                  className="text-sm"
                />
              </div>
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={savePersonalInfo}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={cancelPersonalEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">{editablePersonalInfo.fullName}</h1>
              <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-600">
                <span>{editablePersonalInfo.email}</span>
                <span>•</span>
                <span>{editablePersonalInfo.phone}</span>
                <span>•</span>
                <span>{editablePersonalInfo.location}</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-sm text-blue-600 mt-1">
                {editablePersonalInfo.linkedIn && (
                  <>
                    <span>{editablePersonalInfo.linkedIn}</span>
                    <span>•</span>
                  </>
                )}
                {editablePersonalInfo.portfolio && <span>{editablePersonalInfo.portfolio}</span>}
              </div>
              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditingPersonal(true)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Professional Summary */}
        {sections["PROFESSIONAL SUMMARY"] && renderEditableSection(
          "PROFESSIONAL SUMMARY", 
          "PROFESSIONAL SUMMARY", 
          sections["PROFESSIONAL SUMMARY"]
        )}

        {/* Core Competencies */}
        {(sections["CORE COMPETENCIES"] || sections["SKILLS"]) && renderEditableSection(
          sections["CORE COMPETENCIES"] ? "CORE COMPETENCIES" : "SKILLS",
          "CORE COMPETENCIES",
          sections["CORE COMPETENCIES"] || sections["SKILLS"]
        )}

        {/* Professional Experience */}
        {sections["PROFESSIONAL EXPERIENCE"] && (
          <div className="mb-4 relative group">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">
                PROFESSIONAL EXPERIENCE
              </h2>
              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${editingSections["PROFESSIONAL EXPERIENCE"] ? 'opacity-100' : ''}`}
                  onClick={() => toggleSectionEdit("PROFESSIONAL EXPERIENCE")}
                >
                  {editingSections["PROFESSIONAL EXPERIENCE"] ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {editingSections["PROFESSIONAL EXPERIENCE"] ? (
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                {sections["PROFESSIONAL EXPERIENCE"].map((line, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {line.length > 60 ? (
                      <Textarea
                        value={line}
                        onChange={(e) => updateLineContent("PROFESSIONAL EXPERIENCE", index, e.target.value)}
                        className="flex-1 text-sm"
                        rows={Math.max(2, Math.ceil(line.length / 60))}
                      />
                    ) : (
                      <Input
                        value={line}
                        onChange={(e) => updateLineContent("PROFESSIONAL EXPERIENCE", index, e.target.value)}
                        className="flex-1 text-sm"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeLine("PROFESSIONAL EXPERIENCE", index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addLine("PROFESSIONAL EXPERIENCE")}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Line
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => toggleSectionEdit("PROFESSIONAL EXPERIENCE")}
                    className="flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Done
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Key Projects */}
        {(sections["KEY PROJECTS"] || sections["PROJECTS"]) && (
          <div className="mb-4 relative group">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">
                KEY PROJECTS
              </h2>
              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${editingSections["KEY PROJECTS"] || editingSections["PROJECTS"] ? 'opacity-100' : ''}`}
                  onClick={() => toggleSectionEdit(sections["KEY PROJECTS"] ? "KEY PROJECTS" : "PROJECTS")}
                >
                  {(editingSections["KEY PROJECTS"] || editingSections["PROJECTS"]) ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {(editingSections["KEY PROJECTS"] || editingSections["PROJECTS"]) ? (
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                {(sections["KEY PROJECTS"] || sections["PROJECTS"]).map((line, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {line.length > 60 ? (
                      <Textarea
                        value={line}
                        onChange={(e) => updateLineContent(sections["KEY PROJECTS"] ? "KEY PROJECTS" : "PROJECTS", index, e.target.value)}
                        className="flex-1 text-sm"
                        rows={Math.max(2, Math.ceil(line.length / 60))}
                      />
                    ) : (
                      <Input
                        value={line}
                        onChange={(e) => updateLineContent(sections["KEY PROJECTS"] ? "KEY PROJECTS" : "PROJECTS", index, e.target.value)}
                        className="flex-1 text-sm"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeLine(sections["KEY PROJECTS"] ? "KEY PROJECTS" : "PROJECTS", index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addLine(sections["KEY PROJECTS"] ? "KEY PROJECTS" : "PROJECTS")}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Line
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => toggleSectionEdit(sections["KEY PROJECTS"] ? "KEY PROJECTS" : "PROJECTS")}
                    className="flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Done
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Education */}
        {sections["EDUCATION"] && (
          <div className="mb-4 relative group">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">
                EDUCATION
              </h2>
              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${editingSections["EDUCATION"] ? 'opacity-100' : ''}`}
                  onClick={() => toggleSectionEdit("EDUCATION")}
                >
                  {editingSections["EDUCATION"] ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {editingSections["EDUCATION"] ? (
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                {sections["EDUCATION"].map((line, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {line.length > 60 ? (
                      <Textarea
                        value={line}
                        onChange={(e) => updateLineContent("EDUCATION", index, e.target.value)}
                        className="flex-1 text-sm"
                        rows={Math.max(2, Math.ceil(line.length / 60))}
                      />
                    ) : (
                      <Input
                        value={line}
                        onChange={(e) => updateLineContent("EDUCATION", index, e.target.value)}
                        className="flex-1 text-sm"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeLine("EDUCATION", index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addLine("EDUCATION")}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Line
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => toggleSectionEdit("EDUCATION")}
                    className="flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Done
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Certifications */}
        {sections["CERTIFICATIONS"] && (
          <div className="mb-4 relative group">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-2">
                CERTIFICATIONS
              </h2>
              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${editingSections["CERTIFICATIONS"] ? 'opacity-100' : ''}`}
                  onClick={() => toggleSectionEdit("CERTIFICATIONS")}
                >
                  {editingSections["CERTIFICATIONS"] ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {editingSections["CERTIFICATIONS"] ? (
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                {sections["CERTIFICATIONS"].map((line, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {line.length > 60 ? (
                      <Textarea
                        value={line}
                        onChange={(e) => updateLineContent("CERTIFICATIONS", index, e.target.value)}
                        className="flex-1 text-sm"
                        rows={Math.max(2, Math.ceil(line.length / 60))}
                      />
                    ) : (
                      <Input
                        value={line}
                        onChange={(e) => updateLineContent("CERTIFICATIONS", index, e.target.value)}
                        className="flex-1 text-sm"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeLine("CERTIFICATIONS", index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addLine("CERTIFICATIONS")}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Line
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => toggleSectionEdit("CERTIFICATIONS")}
                    className="flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Done
                  </Button>
                </div>
              </div>
            ) : (
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
                      <div key={index} className="mb-1" dangerouslySetInnerHTML={{ __html: formatTextWithMarkdown(line) }} />
                    )
                  }
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

EditableResumeTemplate.displayName = "EditableResumeTemplate"

export { EditableResumeTemplate }