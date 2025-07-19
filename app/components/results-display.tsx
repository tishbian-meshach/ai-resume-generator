"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Copy, FileText, Edit3, X, Palette, Loader2 } from "lucide-react"
import { EditableResumeTemplate, EditableResumeTemplateRef } from "./editable-resume-template"
import { CustomResumePreview } from "./custom-resume-preview"
import { CustomStylePopup } from "./custom-style-popup"
import { useToast } from "@/hooks/use-toast"

interface PersonalInfo {
  fullName: string
  email: string
  phone: string
  location: string
  linkedIn: string
  portfolio: string
}

interface GeneratedContent {
  resume: string
  coverLetter: string
  companyName: string
  usedFallback: boolean
  customHtmlTemplate?: string
}

interface ResultsDisplayProps {
  generatedContent: GeneratedContent
  personalInfo: PersonalInfo
  companyName?: string
  onGenerateCustomStyle: (styleInstructions: string, isSurpriseMe?: boolean) => Promise<boolean>
  onResetCustomStyle: () => void
  isGeneratingCustomStyle: boolean
}

export function ResultsDisplay({ 
  generatedContent, 
  personalInfo, 
  companyName, 
  onGenerateCustomStyle, 
  onResetCustomStyle,
  isGeneratingCustomStyle 
}: ResultsDisplayProps) {
  const editableResumeRef = useRef<EditableResumeTemplateRef>(null)
  const resumeContentRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editedResumeContent, setEditedResumeContent] = useState(generatedContent.resume)
  const [editedPersonalInfo, setEditedPersonalInfo] = useState(personalInfo)
  const [lastExternalUpdate, setLastExternalUpdate] = useState(generatedContent.resume)

  // Update edited content when generatedContent changes (e.g., from resume fix)
  useEffect(() => {
    // Only update if this is a different external update (not from user editing)
    if (generatedContent.resume !== lastExternalUpdate) {
      setEditedResumeContent(generatedContent.resume)
      setLastExternalUpdate(generatedContent.resume)
      // Exit editing mode when content is updated from external source (like resume fix)
      setIsEditing(false)
    }
  }, [generatedContent.resume, lastExternalUpdate])

  // Update edited personal info when personalInfo changes
  useEffect(() => {
    setEditedPersonalInfo(personalInfo)
  }, [personalInfo])

  const generatePDF = async () => {
    console.log("generatePDF called")
    
    try {
      // Create a new window for printing
      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        console.error("Failed to open print window")
        return
      }

      // Create filename with company name
      const fileName = companyName 
        ? `${personalInfo.fullName.replace(/\s+/g, '_')}_Resume_${companyName.replace(/\s+/g, '_')}`
        : `${personalInfo.fullName.replace(/\s+/g, '_')}_Resume`

      let htmlContent = ""

      // Check if we should use custom HTML template
      if (generatedContent.customHtmlTemplate) {
        console.log("Using custom HTML template")
        
        // Replace placeholders in the custom template
        htmlContent = generatedContent.customHtmlTemplate
          .replace(/\{\{FULL_NAME\}\}/g, personalInfo.fullName)
          .replace(/\{\{EMAIL\}\}/g, personalInfo.email)
          .replace(/\{\{PHONE\}\}/g, personalInfo.phone)
          .replace(/\{\{LOCATION\}\}/g, personalInfo.location)
          .replace(/\{\{LINKEDIN\}\}/g, personalInfo.linkedIn)
          .replace(/\{\{PORTFOLIO\}\}/g, personalInfo.portfolio)
          .replace(/\{\{RESUME_CONTENT\}\}/g, editedResumeContent)
      } else {
        console.log("Using default template")
        
        // Get the resume content from the default template
        let resumeHTML = resumeContentRef.current?.innerHTML || ""
        
        // Fallback: try to get content from EditableResumeTemplate if direct method fails
        if (!resumeHTML && editableResumeRef.current && typeof editableResumeRef.current.getHTMLContent === 'function') {
          console.log("Trying fallback method...")
          resumeHTML = editableResumeRef.current.getHTMLContent() || ""
        }
        
        if (!resumeHTML) {
          console.error("No HTML content found")
          toast({
            title: "Error",
            description: "Could not generate PDF - no content found",
            variant: "destructive",
          })
          return
        }

        // Create the default print document
        htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.4;
                  color: #333;
                  background: white;
                }
                
                .bg-white { background-color: white; }
                .p-4 { padding: 1rem; }
                .max-w-4xl { max-width: 56rem; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                
                .text-center { text-align: center; }
                .text-2xl { font-size: 1.5rem; }
                .text-base { font-size: 1rem; }
                .text-sm { font-size: 0.875rem; }
                .text-xs { font-size: 0.75rem; }
                
                .font-bold { font-weight: bold; }
                .font-semibold { font-weight: 600; }
                
                .text-gray-800 { color: #1f2937; }
                .text-gray-700 { color: #374151; }
                .text-gray-600 { color: #4b5563; }
                .text-blue-600 { color: #2563eb; }
                
                .border-b-2 { border-bottom: 2px solid; }
                .border-b { border-bottom: 1px solid; }
                .border-gray-800 { border-color: #1f2937; }
                .border-gray-400 { border-color: #9ca3af; }
                
                .pb-2 { padding-bottom: 0.5rem; }
                .pb-1 { padding-bottom: 0.25rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mb-5 { margin-bottom: 1.25rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-3 { margin-bottom: 0.75rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-1 { margin-bottom: 0.25rem; }
                .mb-0\.5 { margin-bottom: 0.125rem; }
                .mt-4 { margin-top: 1rem; }
                .mt-3 { margin-top: 0.75rem; }
                .mt-2 { margin-top: 0.5rem; }
                .mt-1 { margin-top: 0.25rem; }
                .ml-4 { margin-left: 1rem; }
                .mr-2 { margin-right: 0.5rem; }
                .mr-1 { margin-right: 0.25rem; }
                .pl-4 { padding-left: 1rem; }
                .pl-5 { padding-left: 1.25rem; }
                
                .flex { display: flex; }
                .flex-wrap { flex-wrap: wrap; }
                .justify-center { justify-content: center; }
                .justify-between { justify-content: space-between; }
                .items-start { align-items: flex-start; }
                .gap-4 { gap: 1rem; }
                .gap-2 { gap: 0.5rem; }
                .text-right { text-align: right; }
                
                .leading-tight { line-height: 1.25; }
                .leading-relaxed { line-height: 1.625; }
                
                .list-disc { list-style-type: disc; }
                
                ul {
                  margin: 0;
                  padding: 0;
                }
                
                ul.list-disc {
                  margin-left: 1rem;
                  margin-bottom: 0.5rem;
                }
                
                ul.list-disc li {
                  margin-bottom: 0.125rem;
                }
                
                @media print {
                  body { 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  
                  .page-break {
                    page-break-before: always;
                  }
                  
                  h2 {
                    page-break-after: avoid;
                  }
                  
                  .mb-4:last-child,
                  .mb-5:last-child,
                  .mb-6:last-child {
                    margin-bottom: 0;
                  }
                  
                  /* Ensure proper spacing in PDF */
                  .mb-0\.5 { margin-bottom: 0.125rem; }
                }
              </style>
            </head>
            <body>
              <div class="bg-white p-4 max-w-4xl mx-auto">
                ${resumeHTML}
              </div>
            </body>
          </html>
        `
      }
      
      console.log("HTML content to write:", htmlContent.substring(0, 500))
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      console.log("Document written and closed")

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
    }
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Close all editing windows when exiting edit mode
      editableResumeRef.current?.closeAllEditing()
    }
    setIsEditing(!isEditing)
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Content</CardTitle>
        <CardDescription>Your personalized ATS-friendly resume and cover letter paragraph</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resume">Resume PDF</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Resume Preview</h3>
              <div className="flex items-center gap-2">
                <CustomStylePopup 
                  onGenerateCustomStyle={onGenerateCustomStyle}
                  isGeneratingCustomStyle={isGeneratingCustomStyle}
                />
                {generatedContent.customHtmlTemplate && (
                  <Button 
                    onClick={onResetCustomStyle}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-gray-600"
                  >
                    <X className="h-3 w-3" />
                    Reset Style
                  </Button>
                )}
                <Button 
                  onClick={handleEditToggle} 
                  variant={isEditing ? "secondary" : "outline"}
                  className={`flex items-center gap-2 ${isEditing ? "bg-gray-500 hover:bg-gray-600 text-white" : ""}`}
                  disabled={!!generatedContent.customHtmlTemplate}
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                  {isEditing ? "Exit Edit" : "Edit Resume"}
                </Button>
                {!isEditing && (
                  <Button onClick={generatePDF} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden bg-gray-50">
              {generatedContent.customHtmlTemplate ? (
                // Show custom styled preview
                <CustomResumePreview
                  htmlTemplate={generatedContent.customHtmlTemplate}
                  personalInfo={editedPersonalInfo}
                  resumeContent={editedResumeContent}
                />
              ) : (
                // Show default editable template
                <div className="max-h-96 overflow-y-auto" ref={resumeContentRef}>
                  <EditableResumeTemplate 
                    ref={editableResumeRef} 
                    resumeContent={editedResumeContent} 
                    personalInfo={editedPersonalInfo}
                    isEditing={isEditing}
                    onContentChange={(newContent) => setEditedResumeContent(newContent)}
                    onPersonalInfoChange={(newPersonalInfo) => setEditedPersonalInfo(newPersonalInfo)}
                  />
                </div>
              )}
            </div>

            {/* Style Status Indicator */}
            {generatedContent.customHtmlTemplate && (
              <div className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div className="flex items-start gap-2">
                  <Palette className="h-4 w-4 mt-0.5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-900">Custom Style Applied</p>
                    <p>Your resume is using AI-generated custom styling. The PDF will reflect your custom design. Editing is disabled for custom styled resumes.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    {isEditing ? "Inline Editing Mode:" : "PDF Download Instructions:"}
                  </p>
                  <p>
                    {isEditing 
                      ? "Hover over any section to see edit buttons. Click to edit content directly in the formatted resume."
                      : "Click \"Download PDF\" to open the print dialog. Choose \"Save as PDF\" as your destination. Click \"Edit Resume\" to make changes."
                    }
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cover-letter" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Cover Letter Paragraph</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generatedContent.coverLetter, "Cover Letter Paragraph")}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Paragraph
              </Button>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <p className="text-sm leading-relaxed">{generatedContent.coverLetter}</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}