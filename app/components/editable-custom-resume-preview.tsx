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

interface StyleOption {
  id: string
  name: string
  description: string
  htmlTemplate: string
  targetHeight: string
  fontSizes: {
    h1: string
    h2: string
    h3: string
    body: string
  }
  spacing: {
    sectionMargin: string
    lineHeight: string
    padding: string
  }
  layout: {
    type: 'single-column' | 'two-column' | 'grid'
    columns?: string
    gap?: string
  }
}

interface MultiStyleResponse {
  options: StyleOption[]
  defaultOption: string
  usedFallback?: boolean
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
  styleOptions?: MultiStyleResponse
  selectedStyleOption?: string
  onStyleOptionChange?: (optionId: string, htmlTemplate: string) => void
  scale?: number
}

const EditableCustomResumePreview = forwardRef<EditableCustomResumePreviewRef, EditableCustomResumePreviewProps>(
  ({ htmlTemplate, personalInfo, resumeContent, isEditing, onContentChange, onPersonalInfoChange, styleOptions, selectedStyleOption, onStyleOptionChange, scale = 1 }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [editablePersonalInfo, setEditablePersonalInfo] = useState(personalInfo)
    const [isEditingPersonal, setIsEditingPersonal] = useState(false)
    const [sections, setSections] = useState<{ [key: string]: string[] }>({})
    const [editingSections, setEditingSections] = useState<{ [key: string]: boolean }>({})
    const [currentStyleOption, setCurrentStyleOption] = useState<string>(selectedStyleOption || 'standard')
    const [autoSelectedOption, setAutoSelectedOption] = useState<string | null>(null)
    const isUserEditingRef = useRef(false)
    const scrollHeightCheckRef = useRef<boolean>(false)

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

    // Update current style option when selectedStyleOption changes
    useEffect(() => {
      if (selectedStyleOption && selectedStyleOption !== currentStyleOption) {
        setCurrentStyleOption(selectedStyleOption)
        // Reset scroll height check when style option changes
        scrollHeightCheckRef.current = false
      }
    }, [selectedStyleOption, currentStyleOption])

    // Function to detect scroll height and select appropriate style option
    const detectAndSelectOptimalStyle = (iframeDoc: Document) => {
      if (!styleOptions || !styleOptions.options || scrollHeightCheckRef.current) return

      const body = iframeDoc.body
      if (!body) return

      // Get the actual content height
      const scrollHeight = body.scrollHeight
      const A4_HEIGHT_PX = 984 // A4 height in pixels at 96 DPI (260mm)
      
      console.log('Content scroll height:', scrollHeight, 'A4 height:', A4_HEIGHT_PX)

      let optimalOption: StyleOption | null = null

      // Determine which style option to use based on content height
      if (scrollHeight <= A4_HEIGHT_PX * 0.7) {
        // Content is short, use spacious layout
        optimalOption = styleOptions.options.find(opt => opt.id === 'spacious') || null
      } else if (scrollHeight <= A4_HEIGHT_PX * 1.1) {
        // Content fits well in standard layout
        optimalOption = styleOptions.options.find(opt => opt.id === 'standard') || null
      } else {
        // Content is long, use compact layout
        optimalOption = styleOptions.options.find(opt => opt.id === 'compact') || null
      }

      if (optimalOption && optimalOption.id !== currentStyleOption) {
        console.log(`Auto-selecting ${optimalOption.id} style due to content height: ${scrollHeight}px`)
        setCurrentStyleOption(optimalOption.id)
        setAutoSelectedOption(optimalOption.id)
        
        // Notify parent component about the style change
        if (onStyleOptionChange) {
          onStyleOptionChange(optimalOption.id, optimalOption.htmlTemplate)
        }
        
        // Mark that we've done the scroll height check to prevent infinite loops
        scrollHeightCheckRef.current = true
        
        // Re-render with the new template after a short delay
        setTimeout(() => {
          if (iframeRef.current) {
            loadIframeContent(optimalOption!.htmlTemplate)
          }
        }, 100)
      } else {
        scrollHeightCheckRef.current = true
      }
    }

    // Function to load content into iframe
    const loadIframeContent = (template: string) => {
      if (!iframeRef.current) return

      // Replace placeholders in the template
      let processedHTML = template
        .replace(/\{\{FULL_NAME\}\}/g, editablePersonalInfo.fullName)
        .replace(/\{\{EMAIL\}\}/g, editablePersonalInfo.email)
        .replace(/\{\{PHONE\}\}/g, editablePersonalInfo.phone)
        .replace(/\{\{LOCATION\}\}/g, editablePersonalInfo.location)
        .replace(/\{\{LINKEDIN\}\}/g, editablePersonalInfo.linkedIn)
        .replace(/\{\{PORTFOLIO\}\}/g, editablePersonalInfo.portfolio)
        .replace(/\{\{RESUME_CONTENT\}\}/g, resumeContent)

      // Apply scaling to the entire document
      const scaleCSS = `
        <style id="resume-scaling">
          /* Scaling Override - High Priority */
          html, body {
            transform: scale(${scale}) !important;
            transform-origin: top left !important;
            width: ${100 / scale}% !important;
            height: ${100 / scale}% !important;
            max-width: none !important;
            max-height: none !important;
            min-width: none !important;
            min-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Ensure container doesn't constrain scaling */
          .resume-container,
          .resume-container-two-col,
          div[class*="container"] {
            max-width: none !important;
            max-height: none !important;
            width: auto !important;
            height: auto !important;
            min-width: none !important;
            min-height: none !important;
          }
          
          /* Override any A4 constraints */
          * {
            max-width: none !important;
            max-height: none !important;
          }
        </style>
      `
        
      // Always apply scaling CSS (even for scale 1 to override any constraints)
      if (processedHTML.includes('</head>')) {
        processedHTML = processedHTML.replace('</head>', scaleCSS + '</head>')
      } else if (processedHTML.includes('<body>')) {
        processedHTML = processedHTML.replace('<body>', '<body>' + scaleCSS)
      } else {
        // Fallback: add at the beginning of the document
        processedHTML = scaleCSS + processedHTML
      }
      
      console.log('Applied scaling CSS for scale:', scale)

      // Ensure external resources can load in iframe by adding proper meta tags and PDF preview CSS
      if (!processedHTML.includes('<meta http-equiv="Content-Security-Policy"')) {
        const headCloseIndex = processedHTML.indexOf('</head>')
        if (headCloseIndex !== -1) {
          const metaTag = `
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https: http:; font-src 'self' 'unsafe-inline' data: https: http:; style-src 'self' 'unsafe-inline' https: http:;">
    <style>
      /* Preview iframe styling to match PDF output */
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }
      body {
        /* Will be set by JavaScript scaling */
        transform-origin: top left !important;
      }
      
      /* PDF Preview Mode - Show how it will look when printed */
      @media screen {
        /* Ensure the preview matches PDF margins */
        .resume-container,
        .resume-container-two-col {
          width: 210mm;
          height: 297mm;
          max-width: 210mm;
          max-height: 297mm;
          overflow: hidden;
          background: white;
        }
      }
      
      /* Actual PDF print styles */
      @media print {
        @page {
          margin: 0 !important;
          padding: 0 !important;
          size: A4 !important;
        }
        
        html {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
        }
        
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        .resume-container,
        .resume-container-two-col {
          width: 210mm !important;
          height: 297mm !important;
          max-width: 210mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
        }
        
        .left-column,
        .right-column,
        .sidebar,
        .main-content {
          page-break-inside: avoid !important;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    </style>
`
          processedHTML = processedHTML.slice(0, headCloseIndex) + metaTag + processedHTML.slice(headCloseIndex)
        }
      }

      // Write the processed HTML to the iframe
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(processedHTML)
        iframeDoc.close()
        
        // Apply custom scaling after content loads
        setTimeout(() => {
          applyScalingToIframe()
          // Check if we need to detect optimal style (for multi-style support)
          if (iframeDoc) {
            detectAndSelectOptimalStyle(iframeDoc)
          }
        }, 100)
        

      }
    }

    // Function to apply scaling directly to iframe content
    const applyScalingToIframe = () => {
      if (!iframeRef.current) return
      
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
      if (iframeDoc) {
        // Remove any existing scaling styles
        const existingStyle = iframeDoc.getElementById('resume-scaling')
        if (existingStyle) {
          existingStyle.remove()
        }
        
        // Add new scaling styles
        const style = iframeDoc.createElement('style')
        style.id = 'resume-scaling'
        style.textContent = `
          html, body {
            transform: scale(${scale}) !important;
            transform-origin: top left !important;
            width: ${100 / scale}% !important;
            max-width: none !important;
            min-width: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
          }
          
          .resume-container,
          .resume-container-two-col,
          div[class*="container"] {
            max-width: none !important;
            max-height: none !important;
            width: auto !important;
            height: auto !important;
            min-width: none !important;
            min-height: none !important;
          }
          
          * {
            max-width: none !important;
            max-height: none !important;
          }
        `
        
        iframeDoc.head.appendChild(style)
        console.log('Applied scaling directly to iframe:', scale)
      }
    }



    // Reset scroll height check when template changes
    useEffect(() => {
      scrollHeightCheckRef.current = false
    }, [htmlTemplate])

    // Update iframe content when template or data changes
    useEffect(() => {
      if (iframeRef.current && htmlTemplate && !isEditing) {
        console.log('Loading iframe content with scale:', scale)
        loadIframeContent(htmlTemplate)
      }
    }, [htmlTemplate, editablePersonalInfo, resumeContent, isEditing, scale])

    // Apply scaling when scale changes (without resizing)
    useEffect(() => {
      if (iframeRef.current && htmlTemplate) {
        setTimeout(() => {
          applyScalingToIframe()
        }, 50)
      }
    }, [scale])

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

    // Manual style option selection handler
    const handleStyleOptionChange = (optionId: string) => {
      const selectedOption = styleOptions?.options.find(opt => opt.id === optionId)
      if (selectedOption) {
        setCurrentStyleOption(optionId)
        setAutoSelectedOption(null) // Clear auto-selection when user manually selects
        scrollHeightCheckRef.current = true // Prevent auto-selection after manual selection
        
        if (onStyleOptionChange) {
          onStyleOptionChange(optionId, selectedOption.htmlTemplate)
        }
        
        // Load the new template
        loadIframeContent(selectedOption.htmlTemplate)
      }
    }

    // Show iframe preview when not editing
    return (
      <div className="w-full border rounded-lg overflow-hidden bg-white">
        {/* Style Options Selector */}
        {styleOptions && styleOptions.options.length > 1 && (
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Layout Options</h3>
              {autoSelectedOption && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Auto-selected: {styleOptions.options.find(opt => opt.id === autoSelectedOption)?.name}
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {styleOptions.options.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant={currentStyleOption === option.id ? "default" : "outline"}
                  onClick={() => handleStyleOptionChange(option.id)}
                  className="text-xs"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{option.name}</span>
                    <span className="text-xs opacity-75">{option.description}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Resume Preview */}
        <div className="w-full" style={{ height: '800px', overflow: 'hidden' }}>
          <iframe
            ref={iframeRef}
            className="w-full h-full"
            title="Custom Resume Preview"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            style={{ 
              border: 'none',
              width: '100%',
              height: '100%',
              display: 'block'
            }}
          />
        </div>
      </div>
    )
  }
)

EditableCustomResumePreview.displayName = "EditableCustomResumePreview"

export { EditableCustomResumePreview }