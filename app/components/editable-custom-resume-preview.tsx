"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Edit3, Check, X, Plus, Trash2 } from "lucide-react"

export interface EditableCustomResumePreviewRef {
  closeAllEditing: () => void
  getHTMLContent: () => string | null
}

interface EditableCustomResumePreviewProps {
  htmlTemplate: string
  personalInfo: {
    fullName: string
    email: string
    phone: string
    location: string
    linkedIn: string
    portfolio: string
  }
  resumeContent: string
  isEditing: boolean
  onContentChange?: (content: string) => void
  onPersonalInfoChange?: (personalInfo: any) => void
}

const EditableCustomResumePreview = forwardRef<EditableCustomResumePreviewRef, EditableCustomResumePreviewProps>(
  ({ htmlTemplate, personalInfo, resumeContent, isEditing, onContentChange, onPersonalInfoChange }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [editablePersonalInfo, setEditablePersonalInfo] = useState(personalInfo)
    const [isEditingPersonal, setIsEditingPersonal] = useState(false)
    const [sections, setSections] = useState<{ [key: string]: string[] }>({})
    const [editingSections, setEditingSections] = useState<{ [key: string]: boolean }>({})
    const isUserEditingRef = useRef(false)

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

    // Update iframe content when template or data changes
    useEffect(() => {
      if (iframeRef.current && htmlTemplate && !isEditing) {
        // Replace placeholders in the template
        const processedHTML = htmlTemplate
          .replace(/\{\{FULL_NAME\}\}/g, editablePersonalInfo.fullName)
          .replace(/\{\{EMAIL\}\}/g, editablePersonalInfo.email)
          .replace(/\{\{PHONE\}\}/g, editablePersonalInfo.phone)
          .replace(/\{\{LOCATION\}\}/g, editablePersonalInfo.location)
          .replace(/\{\{LINKEDIN\}\}/g, editablePersonalInfo.linkedIn)
          .replace(/\{\{PORTFOLIO\}\}/g, editablePersonalInfo.portfolio)
          .replace(/\{\{RESUME_CONTENT\}\}/g, resumeContent)

        // Write the processed HTML to the iframe
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
        if (iframeDoc) {
          iframeDoc.open()
          iframeDoc.write(processedHTML)
          iframeDoc.close()
        }
      }
    }, [htmlTemplate, editablePersonalInfo, resumeContent, isEditing])

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      closeAllEditing: () => {
        setEditingSections({})
        setIsEditingPersonal(false)
      },
      getHTMLContent: () => {
        if (iframeRef.current) {
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
          return iframeDoc?.documentElement?.outerHTML || null
        }
        return null
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
              {content.map((line, index) => (
                <div key={index} className="mb-1">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (!htmlTemplate) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <p className="text-gray-500">No custom template available</p>
        </div>
      )
    }

    // Show editing interface when in editing mode
    if (isEditing) {
      return (
        <div className="w-full h-96 border rounded-lg overflow-hidden bg-white">
          <div className="h-full overflow-y-auto p-4">
            {/* Personal Info Section */}
            <div className="mb-6 relative group">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-800">Personal Information</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${isEditingPersonal ? 'opacity-100' : ''}`}
                  onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                >
                  {isEditingPersonal ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              </div>

              {isEditingPersonal ? (
                <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                  <Input
                    value={editablePersonalInfo.fullName}
                    onChange={(e) => setEditablePersonalInfo(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Full Name"
                    className="font-bold"
                  />
                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                  <Input
                    value={editablePersonalInfo.location}
                    onChange={(e) => setEditablePersonalInfo(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Location"
                    className="text-sm"
                  />
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
                <div className="text-sm text-gray-700">
                  <div className="font-bold text-lg mb-1">{editablePersonalInfo.fullName}</div>
                  <div>{editablePersonalInfo.email} | {editablePersonalInfo.phone}</div>
                  <div>{editablePersonalInfo.location}</div>
                  <div>{editablePersonalInfo.linkedIn} | {editablePersonalInfo.portfolio}</div>
                </div>
              )}
            </div>

            {/* Resume Sections */}
            {Object.entries(sections).map(([sectionKey, content]) => 
              renderEditableSection(sectionKey, sectionKey, content)
            )}
          </div>
        </div>
      )
    }

    // Show iframe preview when not editing
    return (
      <div className="w-full h-96 border rounded-lg overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          className="w-full h-full"
          title="Custom Resume Preview"
          sandbox="allow-same-origin"
          style={{ border: 'none' }}
        />
      </div>
    )
  }
)

EditableCustomResumePreview.displayName = "EditableCustomResumePreview"

export { EditableCustomResumePreview }