"use client"

import { useEffect, useRef } from "react"

interface CustomResumePreviewProps {
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
}

export function CustomResumePreview({ htmlTemplate, personalInfo, resumeContent }: CustomResumePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current && htmlTemplate) {
      // Replace placeholders in the template
      let processedHTML = htmlTemplate
        .replace(/\{\{FULL_NAME\}\}/g, personalInfo.fullName)
        .replace(/\{\{EMAIL\}\}/g, personalInfo.email)
        .replace(/\{\{PHONE\}\}/g, personalInfo.phone)
        .replace(/\{\{LOCATION\}\}/g, personalInfo.location)
        .replace(/\{\{LINKEDIN\}\}/g, personalInfo.linkedIn)
        .replace(/\{\{PORTFOLIO\}\}/g, personalInfo.portfolio)
        .replace(/\{\{RESUME_CONTENT\}\}/g, resumeContent)

      // Ensure external resources can load in iframe by adding proper meta tags
      if (!processedHTML.includes('<meta http-equiv="Content-Security-Policy"')) {
        const headCloseIndex = processedHTML.indexOf('</head>')
        if (headCloseIndex !== -1) {
          const metaTag = `
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https: http:; font-src 'self' 'unsafe-inline' data: https: http:; style-src 'self' 'unsafe-inline' https: http:;">
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
      }
    }
  }, [htmlTemplate, personalInfo, resumeContent])

  if (!htmlTemplate) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No custom template available</p>
      </div>
    )
  }

  return (
    <div className="w-full h-96 border rounded-lg overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        title="Custom Resume Preview"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        style={{ border: 'none' }}
      />
    </div>
  )
}