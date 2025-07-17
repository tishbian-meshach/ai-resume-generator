"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Copy, FileText } from "lucide-react"
import { ResumeTemplate } from "./resume-template"
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
}

interface ResultsDisplayProps {
  generatedContent: GeneratedContent
  personalInfo: PersonalInfo
  companyName?: string
}

export function ResultsDisplay({ generatedContent, personalInfo, companyName }: ResultsDisplayProps) {
  const resumeRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const generatePDF = async () => {
    if (!resumeRef.current) return

    try {
      // Create a new window for printing
      const printWindow = window.open("", "_blank")
      if (!printWindow) return

      // Get the resume content
      const resumeHTML = resumeRef.current.innerHTML

      // Create filename with company name
      const fileName = companyName 
        ? `${personalInfo.fullName.replace(/\s+/g, '_')}_Resume_${companyName.replace(/\s+/g, '_')}`
        : `${personalInfo.fullName.replace(/\s+/g, '_')}_Resume`

      // Create the print document
      printWindow.document.write(`
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
      `)

      printWindow.document.close()

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
              <Button onClick={generatePDF} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <div className="max-h-96 overflow-y-auto">
                <ResumeTemplate ref={resumeRef} resumeContent={generatedContent.resume} personalInfo={personalInfo} />
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">PDF Download Instructions:</p>
                  <p>
                    Click "Download PDF" to open the print dialog. Choose "Save as PDF" as your destination to download the
                    resume as a PDF file.
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