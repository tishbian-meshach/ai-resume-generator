"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Copy, FileText, Edit3, X, Palette, Loader2 } from "lucide-react"
import { EditableResumeTemplate, EditableResumeTemplateRef } from "./editable-resume-template"
import { EditableCustomResumePreview, EditableCustomResumePreviewRef } from "./editable-custom-resume-preview"
import { CustomStylePopup } from "./custom-style-popup"
import { ResumeScaleSlider } from "./resume-scale-slider"
import { useToast } from "@/hooks/use-toast"

interface PersonalInfo {
  fullName: string
  email: string
  phone: string
  location: string
  linkedIn: string
  portfolio: string
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

interface GeneratedContent {
  resume: string
  coverLetter: string
  companyName: string
  usedFallback: boolean
  customHtmlTemplate?: string
  customStyleOptions?: MultiStyleResponse
  selectedStyleOption?: string
}

interface ResultsDisplayProps {
  generatedContent: GeneratedContent
  personalInfo: PersonalInfo
  companyName?: string
  onGenerateCustomStyle: (styleInstructions: string, isSurpriseMe?: boolean) => Promise<boolean>
  onResetCustomStyle: () => void
  isGeneratingCustomStyle: boolean
  onStyleOptionChange?: (optionId: string, htmlTemplate: string) => void
}

export function ResultsDisplay({ 
  generatedContent, 
  personalInfo, 
  companyName, 
  onGenerateCustomStyle, 
  onResetCustomStyle,
  isGeneratingCustomStyle,
  onStyleOptionChange
}: ResultsDisplayProps) {
  const editableResumeRef = useRef<EditableResumeTemplateRef>(null)
  const editableCustomResumeRef = useRef<EditableCustomResumePreviewRef>(null)
  const resumeContentRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editedResumeContent, setEditedResumeContent] = useState(generatedContent.resume)
  const [editedPersonalInfo, setEditedPersonalInfo] = useState(personalInfo)
  const [lastExternalUpdate, setLastExternalUpdate] = useState(generatedContent.resume)
  const [resumeScale, setResumeScale] = useState(1)

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

      // Create filename with company name using edited personal info
      const fileName = companyName 
        ? `${editedPersonalInfo.fullName.replace(/\s+/g, '_')}_Resume_${companyName.replace(/\s+/g, '_')}`
        : `${editedPersonalInfo.fullName.replace(/\s+/g, '_')}_Resume`

      // Extract all CSS from the current page
      const extractAllCSS = () => {
        let allCSS = ''
        
        // Get all stylesheets
        for (let i = 0; i < document.styleSheets.length; i++) {
          try {
            const styleSheet = document.styleSheets[i]
            if (styleSheet.cssRules) {
              for (let j = 0; j < styleSheet.cssRules.length; j++) {
                allCSS += styleSheet.cssRules[j].cssText + '\n'
              }
            }
          } catch (e) {
            // Skip stylesheets that can't be accessed (CORS)
            console.log('Skipping stylesheet due to CORS:', e)
          }
        }
        
        // Also get inline styles from style tags
        const styleTags = document.querySelectorAll('style')
        styleTags.forEach(tag => {
          allCSS += tag.textContent + '\n'
        })
        
        return allCSS
      }

      const allPageCSS = extractAllCSS()
      console.log("Extracted CSS length:", allPageCSS.length)

      let htmlContent = ""

      // Create PDF-optimized CSS that includes all page styles plus scaling
      const createScaledCSS = (originalCSS: string) => {
        let scaledCSS = originalCSS
        
        // Apply scaling to common Tailwind classes
        
        // Font size classes
        const fontSizeClasses = [
          { class: 'text-xs', value: 0.75 },
          { class: 'text-sm', value: 0.875 },
          { class: 'text-base', value: 1 },
          { class: 'text-lg', value: 1.125 },
          { class: 'text-xl', value: 1.25 },
          { class: 'text-2xl', value: 1.5 },
          { class: 'text-3xl', value: 1.875 },
          { class: 'text-4xl', value: 2.25 },
          { class: 'text-5xl', value: 3 },
          { class: 'text-6xl', value: 3.75 }
        ]
        
        // Spacing classes
        const spacingClasses = [
          // Padding classes
          { class: 'p-1', value: 0.25 }, { class: 'p-2', value: 0.5 }, { class: 'p-3', value: 0.75 }, 
          { class: 'p-4', value: 1 }, { class: 'p-5', value: 1.25 }, { class: 'p-6', value: 1.5 }, { class: 'p-8', value: 2 },
          { class: 'px-1', value: 0.25 }, { class: 'px-2', value: 0.5 }, { class: 'px-3', value: 0.75 }, 
          { class: 'px-4', value: 1 }, { class: 'px-6', value: 1.5 }, { class: 'px-8', value: 2 },
          { class: 'py-1', value: 0.25 }, { class: 'py-2', value: 0.5 }, { class: 'py-3', value: 0.75 }, 
          { class: 'py-4', value: 1 }, { class: 'py-6', value: 1.5 },
          { class: 'pt-1', value: 0.25 }, { class: 'pt-2', value: 0.5 }, { class: 'pt-3', value: 0.75 }, 
          { class: 'pt-4', value: 1 }, { class: 'pt-6', value: 1.5 }, { class: 'pt-8', value: 2 },
          { class: 'pb-1', value: 0.25 }, { class: 'pb-2', value: 0.5 }, { class: 'pb-3', value: 0.75 }, 
          { class: 'pb-4', value: 1 }, { class: 'pb-6', value: 1.5 }, { class: 'pb-8', value: 2 },
          { class: 'pl-1', value: 0.25 }, { class: 'pl-2', value: 0.5 }, { class: 'pl-3', value: 0.75 }, 
          { class: 'pl-4', value: 1 }, { class: 'pl-6', value: 1.5 },
          { class: 'pr-1', value: 0.25 }, { class: 'pr-2', value: 0.5 }, { class: 'pr-3', value: 0.75 }, 
          { class: 'pr-4', value: 1 }, { class: 'pr-6', value: 1.5 },
          
          // Margin classes
          { class: 'm-1', value: 0.25 }, { class: 'm-2', value: 0.5 }, { class: 'm-3', value: 0.75 }, 
          { class: 'm-4', value: 1 }, { class: 'm-6', value: 1.5 }, { class: 'm-8', value: 2 },
          { class: 'mx-1', value: 0.25 }, { class: 'mx-2', value: 0.5 }, { class: 'mx-3', value: 0.75 }, 
          { class: 'mx-4', value: 1 }, { class: 'mx-6', value: 1.5 },
          { class: 'my-1', value: 0.25 }, { class: 'my-2', value: 0.5 }, { class: 'my-3', value: 0.75 }, 
          { class: 'my-4', value: 1 }, { class: 'my-6', value: 1.5 },
          { class: 'mt-1', value: 0.25 }, { class: 'mt-2', value: 0.5 }, { class: 'mt-3', value: 0.75 }, 
          { class: 'mt-4', value: 1 }, { class: 'mt-6', value: 1.5 }, { class: 'mt-8', value: 2 },
          { class: 'mb-1', value: 0.25 }, { class: 'mb-2', value: 0.5 }, { class: 'mb-3', value: 0.75 }, 
          { class: 'mb-4', value: 1 }, { class: 'mb-6', value: 1.5 }, { class: 'mb-8', value: 2 },
          { class: 'ml-1', value: 0.25 }, { class: 'ml-2', value: 0.5 }, { class: 'ml-3', value: 0.75 }, 
          { class: 'ml-4', value: 1 }, { class: 'ml-6', value: 1.5 },
          { class: 'mr-1', value: 0.25 }, { class: 'mr-2', value: 0.5 }, { class: 'mr-3', value: 0.75 }, 
          { class: 'mr-4', value: 1 }, { class: 'mr-6', value: 1.5 },
          
          // Gap classes
          { class: 'gap-1', value: 0.25 }, { class: 'gap-2', value: 0.5 }, { class: 'gap-3', value: 0.75 }, 
          { class: 'gap-4', value: 1 }, { class: 'gap-6', value: 1.5 }
        ]
        
        // Apply scaling to font size classes
        fontSizeClasses.forEach(({ class: className, value }) => {
          const scaledValue = value * resumeScale
          scaledCSS += `\n.${className} { font-size: ${scaledValue}rem !important; }`
        })
        
        // Add default font scaling for common HTML elements
        const defaultFontSizes = {
          'body': 1,
          'p': 1,
          'div': 1,
          'span': 1,
          'li': 1,
          'td': 1,
          'th': 1,
          'h1': 2,
          'h2': 1.5,
          'h3': 1.17,
          'h4': 1,
          'h5': 0.83,
          'h6': 0.67,
          'small': 0.875,
          'strong': 1,
          'b': 1,
          'em': 1,
          'i': 1
        }
        
        // Apply default font scaling to elements that don't have explicit font-size
        Object.entries(defaultFontSizes).forEach(([element, baseSize]) => {
          const scaledSize = baseSize * resumeScale
          scaledCSS += `\n${element}:not([style*="font-size"]):not([class*="text-"]) { font-size: ${scaledSize}rem !important; }`
        })
        
        // Apply scaling to each class
        spacingClasses.forEach(({ class: className, value }) => {
          const scaledValue = value * resumeScale
          const regex = new RegExp(`\\.${className}\\s*{[^}]*}`, 'g')
          
          // For padding classes
          if (className.startsWith('p')) {
            if (className.startsWith('px-')) {
              scaledCSS += `\n.${className} { padding-left: ${scaledValue}rem !important; padding-right: ${scaledValue}rem !important; }`
            } else if (className.startsWith('py-')) {
              scaledCSS += `\n.${className} { padding-top: ${scaledValue}rem !important; padding-bottom: ${scaledValue}rem !important; }`
            } else if (className.startsWith('pt-')) {
              scaledCSS += `\n.${className} { padding-top: ${scaledValue}rem !important; }`
            } else if (className.startsWith('pb-')) {
              scaledCSS += `\n.${className} { padding-bottom: ${scaledValue}rem !important; }`
            } else if (className.startsWith('pl-')) {
              scaledCSS += `\n.${className} { padding-left: ${scaledValue}rem !important; }`
            } else if (className.startsWith('pr-')) {
              scaledCSS += `\n.${className} { padding-right: ${scaledValue}rem !important; }`
            } else if (className.startsWith('p-')) {
              scaledCSS += `\n.${className} { padding: ${scaledValue}rem !important; }`
            }
          }
          // For margin classes
          else if (className.startsWith('m')) {
            if (className.startsWith('mx-')) {
              scaledCSS += `\n.${className} { margin-left: ${scaledValue}rem !important; margin-right: ${scaledValue}rem !important; }`
            } else if (className.startsWith('my-')) {
              scaledCSS += `\n.${className} { margin-top: ${scaledValue}rem !important; margin-bottom: ${scaledValue}rem !important; }`
            } else if (className.startsWith('mt-')) {
              scaledCSS += `\n.${className} { margin-top: ${scaledValue}rem !important; }`
            } else if (className.startsWith('mb-')) {
              scaledCSS += `\n.${className} { margin-bottom: ${scaledValue}rem !important; }`
            } else if (className.startsWith('ml-')) {
              scaledCSS += `\n.${className} { margin-left: ${scaledValue}rem !important; }`
            } else if (className.startsWith('mr-')) {
              scaledCSS += `\n.${className} { margin-right: ${scaledValue}rem !important; }`
            } else if (className.startsWith('m-')) {
              scaledCSS += `\n.${className} { margin: ${scaledValue}rem !important; }`
            }
          }
          // For gap classes
          else if (className.startsWith('gap-')) {
            scaledCSS += `\n.${className} { gap: ${scaledValue}rem !important; }`
          }
        })
        
        // Add space-between classes
        const spaceValues = [0.25, 0.5, 0.75, 1, 1.5]
        spaceValues.forEach((value, index) => {
          const scaledValue = value * resumeScale
          const className = `space-y-${index + 1}`
          scaledCSS += `\n.${className} > * + * { margin-top: ${scaledValue}rem !important; }`
          const classNameX = `space-x-${index + 1}`
          scaledCSS += `\n.${classNameX} > * + * { margin-left: ${scaledValue}rem !important; }`
        })
        
        return scaledCSS
      }

      const pdfOptimizationCSS = `
    <style>
    /* Simplified PDF optimization with unified scaling */
    
    /* PDF Print Optimization - Intelligent page breaks */
    @media print {
      @page {
        margin: 0.5in !important; /* Reasonable margins for better print layout */
        size: A4 !important;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      body {
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      
      /* Allow all containers to flow naturally with line-by-line breaks */
      .resume-container,
      .resume-container-two-col,
      .left-column,
      .right-column,
      .sidebar,
      .main-content,
      div[class*="section"],
      section,
      article,
      div[class*="experience"],
      div[class*="education"],
      div[class*="skills"],
      div[class*="projects"],
      div,
      main {
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        page-break-inside: auto !important;
        page-break-before: auto !important;
        page-break-after: auto !important;
        break-inside: auto !important;
        break-before: auto !important;
        break-after: auto !important;
        position: relative !important;
        display: block !important;
        contain: none !important;
      }
      
      /* Specifically target resume sections to ensure they can break */
      .experience-section,
      .education-section,
      .skills-section,
      .projects-section,
      .certifications-section,
      .awards-section,
      .summary-section,
      .objective-section,
      div[class*="experience"],
      div[class*="education"],
      div[class*="skills"],
      div[class*="projects"],
      div[class*="section"],
      section {
        page-break-inside: auto !important;
        break-inside: auto !important;
        contain: none !important;
        isolation: auto !important;
        display: block !important;
        position: relative !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }
      
      /* Force line-by-line breaks for content elements */
      h1, h2, h3, h4, h5, h6 {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
        break-inside: avoid !important;
        break-after: auto !important;
        orphans: 2 !important;
        widows: 2 !important;
      }
      
      /* Allow natural breaks within paragraphs and lists */
      p, li, ul, ol, div {
        page-break-inside: auto !important;
        page-break-before: auto !important;
        page-break-after: auto !important;
        break-inside: auto !important;
        break-before: auto !important;
        break-after: auto !important;
        orphans: 1 !important;
        widows: 1 !important;
      }
      
      /* Specifically target resume sections to allow internal breaks */
      .resume-section,
      .experience-section,
      .education-section,
      .skills-section,
      .projects-section,
      div[class*="experience"],
      div[class*="education"],
      div[class*="skills"],
      div[class*="projects"],
      div[class*="section"] {
        page-break-inside: auto !important;
        break-inside: auto !important;
        orphans: 1 !important;
        widows: 1 !important;
      }
      
      /* Override any CSS that might prevent line-by-line breaks */
      .avoid-break,
      .no-break,
      [style*="page-break-inside: avoid"],
      [style*="break-inside: avoid"] {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      
      /* Ensure list items can break naturally */
      ul, ol {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      
      li {
        page-break-inside: auto !important;
        break-inside: auto !important;
        orphans: 1 !important;
        widows: 1 !important;
      }
      
      /* Allow breaks within job entries, education entries, etc. */
      .job-entry,
      .education-entry,
      .project-entry,
      .experience-item,
      .education-item,
      .project-item,
      div[class*="entry"],
      div[class*="item"],
      .work-experience,
      .work-experience > div,
      .education > div,
      .projects > div,
      .skills > div,
      .experience > div,
      ul > li,
      ol > li {
        page-break-inside: auto !important;
        break-inside: auto !important;
        orphans: 1 !important;
        widows: 1 !important;
        display: block !important;
        contain: none !important;
        isolation: auto !important;
        position: relative !important;
        overflow: visible !important;
        height: auto !important;
      }
      
      /* Force content to flow naturally as a single stream */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        box-sizing: border-box !important;
        orphans: 1 !important;
        widows: 1 !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      
      /* Override any CSS that might force artificial breaks */
      *[style*="page-break"],
      *[style*="break-"],
      *[class*="page-break"],
      *[class*="break-"] {
        page-break-inside: auto !important;
        page-break-before: auto !important;
        page-break-after: auto !important;
        break-inside: auto !important;
        break-before: auto !important;
        break-after: auto !important;
      }
      
      /* Aggressively override ALL possible page break sources */
      * {
        page-break-before: auto !important;
        page-break-after: auto !important;
        page-break-inside: auto !important;
        break-before: auto !important;
        break-after: auto !important;
        break-inside: auto !important;
        -webkit-column-break-before: auto !important;
        -webkit-column-break-after: auto !important;
        -webkit-column-break-inside: auto !important;
        column-break-before: auto !important;
        column-break-after: auto !important;
        column-break-inside: auto !important;
        contain: none !important;
        isolation: auto !important;
        will-change: auto !important;
      }
      
      /* Force text content to be breakable */
      p, div, span, text, 
      .job-title, .company-name, .job-duration,
      .school-name, .degree-name, .education-duration,
      .project-title, .project-description,
      .skill-category, .skill-list,
      h1, h2, h3, h4, h5, h6,
      ul, ol, li, dt, dd {
        page-break-inside: auto !important;
        break-inside: auto !important;
        contain: none !important;
        isolation: auto !important;
        overflow-wrap: break-word !important;
        word-wrap: break-word !important;
        hyphens: auto !important;
        -webkit-hyphens: auto !important;
        -moz-hyphens: auto !important;
        -ms-hyphens: auto !important;
      }
      
      /* Prevent unnecessary page breaks by making content more compact */
      body {
        line-height: 1.2 !important;
      }
      
      /* Optimize margins for better space utilization - less aggressive */
      div, section, article {
        margin-bottom: ${Math.max(0.1, 0.15 * resumeScale)}rem !important;
      }
      
      p, ul, ol {
        margin-top: 0 !important;
        margin-bottom: ${Math.max(0.05, 0.1 * resumeScale)}rem !important;
      }
      
      li {
        margin-bottom: 0 !important;
      }
      
      /* Remove excessive bottom spacing that creates empty space */
      body {
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
      }
      
      /* Optimize container margins */
      .resume-container,
      .resume-container-two-col,
      .left-column,
      .right-column,
      .sidebar,
      .main-content {
        margin-bottom: 0 !important;
        padding-bottom: ${Math.max(0.1, 0.2 * resumeScale)}rem !important;
      }
      
      /* Make sure the main content area uses full available height */
      .resume-container,
      .resume-container-two-col {
        min-height: auto !important;
        height: auto !important;
      }
      
      /* Override any fixed heights that might cause issues */
      [style*="height"] {
        height: auto !important;
      }
      
      /* Force all layout containers to behave as normal block flow */
      .flex, 
      [style*="display: flex"], 
      [style*="display:flex"],
      [style*="display: grid"],
      [style*="display:grid"] {
        display: block !important;
        align-items: unset !important;
        justify-content: unset !important;
        flex-direction: unset !important;
        grid-template-columns: unset !important;
        grid-template-rows: unset !important;
      }
      
      /* Remove any column layouts that might cause artificial breaks */
      [style*="column-count"],
      [style*="columns"] {
        column-count: 1 !important;
        columns: auto !important;
      }
      
      /* Force more aggressive space utilization */
      
      /* Remove any transform scaling issues that might cause space problems */
      html {
        height: auto !important;
        overflow: visible !important;
      }
      
      /* Ensure content flows naturally without artificial constraints */
      body > * {
        max-height: none !important;
        height: auto !important;
      }
      
      /* Force single column layout to prevent artificial breaks */
      .resume-container-two-col,
      .two-column,
      [class*="two-col"],
      [class*="column"] {
        display: block !important;
        width: 100% !important;
        float: none !important;
        clear: both !important;
      }
      
      /* Remove any absolute positioning that might cause layout issues */
      [style*="position: absolute"],
      [style*="position:absolute"] {
        position: relative !important;
      }
      
      /* Ensure all content is in normal document flow */
      .left-column,
      .right-column,
      .sidebar,
      .main-content {
        display: block !important;
        width: 100% !important;
        float: none !important;
        position: relative !important;
      }
      
      /* Target specific elements that commonly cause breaks - optimize for space usage */
      .skills,
      .education,
      .experience,
      .projects,
      .certifications,
      .awards,
      .references,
      [class*="skills"],
      [class*="education"],
      [class*="experience"],
      [class*="projects"],
      [class*="certifications"],
      [class*="awards"],
      [class*="references"] {
        page-break-before: auto !important;
        page-break-after: auto !important;
        page-break-inside: auto !important;
        break-before: auto !important;
        break-after: auto !important;
        break-inside: auto !important;
        display: block !important;
        position: relative !important;
        float: none !important;
        clear: none !important;
        /* Minimize spacing around sections */
        margin-top: ${Math.max(0.15, 0.2 * resumeScale)}rem !important;
        margin-bottom: ${Math.max(0.1, 0.15 * resumeScale)}rem !important;
      }
      
      /* Special handling for last sections to prevent unnecessary spacing */
      section:last-child,
      div:last-child,
      .resume-section:last-child,
      .certifications:last-child,
      [class*="certifications"]:last-child {
        page-break-before: auto !important;
        page-break-after: auto !important;
        page-break-inside: auto !important;
        break-before: auto !important;
        break-after: auto !important;
        break-inside: auto !important;
        display: block !important;
        position: relative !important;
        float: none !important;
        clear: none !important;
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
        /* Additional fixes for last section flow */
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        contain: none !important;
        isolation: auto !important;
      }
      
      /* Aggressive fix for certification sections specifically */
      .certifications,
      .certifications-section,
      div[class*="certification"],
      section[class*="certification"],
      [class*="certifications"] {
        page-break-before: auto !important;
        page-break-after: auto !important;
        page-break-inside: auto !important;
        break-before: auto !important;
        break-after: auto !important;
        break-inside: auto !important;
        display: block !important;
        position: relative !important;
        float: none !important;
        clear: none !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        contain: none !important;
        isolation: auto !important;
        margin-top: ${Math.max(0.15, 0.2 * resumeScale)}rem !important;
        margin-bottom: ${Math.max(0.1, 0.15 * resumeScale)}rem !important;
      }
      
      /* Force content to be treated as a single continuous block */
      body {
        column-count: 1 !important;
        column-fill: auto !important;
        -webkit-column-count: 1 !important;
        -webkit-column-fill: auto !important;
      }
      
      /* Remove any CSS that creates artificial containers */
      .container,
      .wrapper,
      .content,
      [class*="container"],
      [class*="wrapper"],
      [class*="content"] {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        overflow: visible !important;
        position: relative !important;
        float: none !important;
        clear: none !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
        contain: none !important;
        isolation: auto !important;
      }
      
      /* Specifically target main resume containers to ensure they don't constrain content */
      .resume-container,
      .resume-container-two-col,
      div[class*="resume-container"] {
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        overflow: visible !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
        contain: none !important;
        isolation: auto !important;
        display: block !important;
        position: relative !important;
      }
      
      /* Specifically target the last elements that might be stuck */
      *:last-child,
      *:last-of-type {
        page-break-before: auto !important;
        break-before: auto !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
      }
      
      /* Ensure natural content flow without artificial height constraints */
      html, body {
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Remove any artificial height constraints */
      * {
        min-height: 0 !important;
        max-height: none !important;
      }
      
      /* Optimize spacing between elements - less aggressive */
      h1, h2, h3, h4, h5, h6 {
        margin-bottom: ${Math.max(0.15, 0.2 * resumeScale)}rem !important;
      }
      
      /* Control section spacing without removing all margins */
      .resume-section + .resume-section,
      section + section,
      div[class*="section"] + div[class*="section"] {
        margin-top: ${Math.max(0.2, 0.3 * resumeScale)}rem !important;
      }
      
      /* Preserve natural spacing for readability */
      * + * {
        margin-top: inherit !important;
      }
      
      /* Specific fixes for common resume section structures */
      /* Target sections with headers followed by content */
      h1 + div, h2 + div, h3 + div, h4 + div, h5 + div, h6 + div,
      .section-title + div, .section-header + div,
      [class*="title"] + div, [class*="header"] + div {
        page-break-inside: auto !important;
        break-inside: auto !important;
        contain: none !important;
      }
      
      /* Target job/education/project entries specifically - preserve reasonable spacing */
      .mb-4, .mb-6, .mb-8, /* Common Tailwind margin bottom classes */
      [class*="experience-"], [class*="education-"], [class*="project-"],
      [class*="job-"], [class*="work-"], [class*="school-"],
      .border-b, .border-t, /* Common separator classes */
      [style*="border-bottom"], [style*="border-top"] {
        page-break-inside: auto !important;
        break-inside: auto !important;
        contain: none !important;
        /* Preserve original margins but make them scale-aware */
        margin-bottom: inherit !important;
        padding-bottom: inherit !important;
      }
      
      /* Force break opportunities after each major content block */
      .mb-4:after, .mb-6:after, .mb-8:after,
      [class*="entry"]:after, [class*="item"]:after {
        content: "" !important;
        display: block !important;
        height: 0 !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
    }
    
    /* Screen display optimization - removed since using unified scaling in individual templates */
    </style>`

      // Pre-process HTML to improve page breaking by flattening structures
      const improvePageBreaking = (html: string) => {
        // Create a temporary DOM to manipulate the HTML
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        
        // Find sections and add explicit break points between major content blocks
        const addBreakPoints = (element: Element) => {
          const children = Array.from(element.children)
          
          children.forEach((child: Element, index: number) => {
            // Add break opportunity after each major content block
            if (index > 0 && (
              child.classList.contains('mb-4') ||
              child.classList.contains('mb-6') ||
              child.classList.contains('mb-8') ||
              (child.className && child.className.toString().includes('experience')) ||
              (child.className && child.className.toString().includes('education')) ||
              (child.className && child.className.toString().includes('project')) ||
              (child.className && child.className.toString().includes('job')) ||
              (child.className && child.className.toString().includes('entry')) ||
              (child.className && child.className.toString().includes('item')) ||
              child.tagName.toLowerCase() === 'section'
            )) {
              // Insert a subtle break hint div
              const breakHint = document.createElement('div')
              breakHint.style.height = '0'
              breakHint.style.pageBreakInside = 'auto'
              breakHint.style.breakInside = 'auto'
              breakHint.className = 'page-break-hint'
              element.insertBefore(breakHint, child)
            }
            
            // For sections with multiple children, add break hints between them too
            if ((child.className && child.className.toString().includes('section')) || child.tagName.toLowerCase() === 'section') {
              const sectionChildren = Array.from(child.children)
              // Insert break opportunities between section content
              for (let i = sectionChildren.length - 1; i > 0; i--) {
                const sectionChild = sectionChildren[i]
                if (sectionChild.classList.contains('mb-4') || 
                    sectionChild.classList.contains('mb-6') ||
                    sectionChild.classList.contains('mb-8') ||
                    sectionChild.tagName.toLowerCase() === 'div') {
                  const innerBreakHint = document.createElement('div')
                  innerBreakHint.style.height = '0'
                  innerBreakHint.style.pageBreakInside = 'auto'
                  innerBreakHint.style.breakInside = 'auto'
                  innerBreakHint.className = 'page-break-hint'
                  child.insertBefore(innerBreakHint, sectionChild)
                }
              }
            }
            
            // Recursively process children
            if (child.children.length > 0) {
              addBreakPoints(child)
            }
          })
        }
        
        // Apply break point improvements
        addBreakPoints(tempDiv)
        
        // Convert any deeply nested sections to flatter structure
        const flattenSections = (element: Element) => {
          const sections = element.querySelectorAll('div[class*="section"], section')
          sections.forEach(section => {
            // Remove any height constraints and properties that create block formatting contexts
            const style = section.getAttribute('style') || ''
            const newStyle = style
              .replace(/height:\s*[^;]*;?/g, '')
              .replace(/min-height:\s*[^;]*;?/g, '')
              .replace(/max-height:\s*[^;]*;?/g, '')
              .replace(/overflow:\s*hidden[^;]*;?/g, 'overflow: visible;')
              .replace(/display:\s*flex[^;]*;?/g, 'display: block;')
              .replace(/display:\s*grid[^;]*;?/g, 'display: block;')
              .replace(/position:\s*relative[^;]*;?/g, 'position: static;')
              .replace(/position:\s*absolute[^;]*;?/g, 'position: static;')
              .replace(/transform:\s*[^;]*;?/g, '')
              .replace(/z-index:\s*[^;]*;?/g, '')
              .replace(/contain:\s*[^;]*;?/g, 'contain: none;')
              .replace(/isolation:\s*[^;]*;?/g, 'isolation: auto;')
            
            if (newStyle !== style) {
              section.setAttribute('style', newStyle)
            }
            
            // Add explicit page break allowance
            section.setAttribute('data-allow-break', 'true')
          })
          
          // Also target individual entries within sections
          const entries = element.querySelectorAll('.mb-4, .mb-6, .mb-8, div[class*="border"]')
          entries.forEach(entry => {
            const style = entry.getAttribute('style') || ''
            const newStyle = style
              .replace(/display:\s*flex[^;]*;?/g, 'display: block;')
              .replace(/display:\s*grid[^;]*;?/g, 'display: block;')
              .replace(/position:\s*relative[^;]*;?/g, 'position: static;')
              .replace(/contain:\s*[^;]*;?/g, 'contain: none;')
            
            if (newStyle !== style) {
              entry.setAttribute('style', newStyle)
            }
            
            entry.setAttribute('data-allow-break', 'true')
          })
        }
        
        flattenSections(tempDiv)
        
        return tempDiv.innerHTML
      }

      // Check if we should use custom HTML template
      if (generatedContent.customHtmlTemplate) {
        console.log("Using custom HTML template")
        
        // Try to get the actual rendered HTML from the custom resume preview iframe
        let processedTemplate = editableCustomResumeRef.current?.getHTMLContent()
        
        if (processedTemplate) {
          console.log("Using rendered HTML from custom resume preview iframe")
          // Keep the content as-is but remove only the viewport scaling transforms
          processedTemplate = processedTemplate
            .replace(/width:\s*\d+(?:\.\d+)?%[^;]*;?/g, 'width: 100%;')
            .replace(/height:\s*\d+(?:\.\d+)?%[^;]*;?/g, 'height: auto;')
            // Remove only the HTML/body transform scaling, not individual element scaling
            .replace(/html\s*,?\s*body\s*\{[^}]*transform:\s*scale\([^)]*\)[^}]*\}/g, '')
            .replace(/html\s*\{[^}]*transform:\s*scale\([^)]*\)[^}]*\}/g, '')
            .replace(/body\s*\{[^}]*transform:\s*scale\([^)]*\)[^}]*\}/g, '')
        } else {
          console.log("Falling back to manual template processing")
          // Fallback to manual processing if iframe content is not available
          processedTemplate = generatedContent.customHtmlTemplate
            .replace(/\{\{FULL_NAME\}\}/g, editedPersonalInfo.fullName)
            .replace(/\{\{EMAIL\}\}/g, editedPersonalInfo.email)
            .replace(/\{\{PHONE\}\}/g, editedPersonalInfo.phone)
            .replace(/\{\{LOCATION\}\}/g, editedPersonalInfo.location)
            .replace(/\{\{LINKEDIN\}\}/g, editedPersonalInfo.linkedIn)
            .replace(/\{\{PORTFOLIO\}\}/g, editedPersonalInfo.portfolio)
            .replace(/\{\{RESUME_CONTENT\}\}/g, editedResumeContent)
            // Remove inline height constraints and transforms that might crop content
            .replace(/style="([^"]*?)height:\s*[^;]*;?([^"]*)"/g, 'style="$1height: auto;$2"')
            .replace(/style="([^"]*?)max-height:\s*[^;]*;?([^"]*)"/g, 'style="$1max-height: none;$2"')
            .replace(/style="([^"]*?)min-height:\s*[^;]*;?([^"]*)"/g, 'style="$1min-height: 0;$2"')
            .replace(/style="([^"]*?)overflow:\s*hidden[^;]*;?([^"]*)"/g, 'style="$1overflow: visible;$2"')
            .replace(/style="([^"]*?)transform:\s*[^;]*;?([^"]*)"/g, 'style="$1transform: none;$2"')
            .replace(/style="([^"]*?)zoom:\s*[^;]*;?([^"]*)"/g, 'style="$1zoom: 1;$2"')
        }

        // Apply unified scaling approach that matches the preview exactly
        {
          // Add unified scaling CSS that matches preview behavior exactly
          const addScalingCSS = (template: string) => {
            const scalingCSS = `
              <style id="pdf-scaling">
                /* Unified scaling approach - matches preview exactly */
                @media screen {
                  /* Screen preview scaling */
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    overflow: visible !important;
                  }
                  
                  body {
                    transform: scale(${resumeScale}) !important;
                    transform-origin: top left !important;
                    width: ${100 / resumeScale}% !important;
                    height: auto !important;
                  }
                }
                
                @media print {
                  @page {
                    margin: 0.5in !important;
                    size: A4 !important;
                  }
                  
                  /* PDF scaling to match A4 preview constraints */
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }
                  
                  body {
                    transform: scale(${resumeScale}) !important;
                    transform-origin: top left !important;
                    width: ${100 / resumeScale}% !important;
                    height: auto !important;
                    /* Ensure content fits within A4 page bounds like the preview */
                    max-width: calc(210mm / ${resumeScale}) !important;
                  }
                  
                  /* Ensure all containers flow naturally within page bounds */
                  .resume-container,
                  .resume-container-two-col,
                  div[class*="container"],
                  .left-column,
                  .right-column,
                  .sidebar,
                  .main-content,
                  section,
                  div {
                    max-width: 100% !important;
                    max-height: none !important;
                    height: auto !important;
                    overflow: visible !important;
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    position: relative !important;
                  }
                  
                  /* Remove any conflicting scaling or sizing */
                  *:not(body) {
                    zoom: 1 !important;
                    max-height: none !important;
                  }
                }
              </style>
            `
            
            // Insert the scaling CSS
            if (template.includes('</head>')) {
              return template.replace('</head>', scalingCSS + '</head>')
            } else if (template.includes('<body>')) {
              return template.replace('<body>', '<body>' + scalingCSS)
            } else {
              return scalingCSS + template
            }
          }
          
          // Apply the scaling CSS
          processedTemplate = addScalingCSS(processedTemplate)
          
          console.log(`PDF scaling: Using unified transform scale(${resumeScale}) approach for both preview and PDF`)
          
          // Legacy function for comprehensive CSS property scaling (disabled - using zoom/transform instead)
          const scaleCustomTemplateCSS_DISABLED = (template: string) => {
            let scaledTemplate = template
            
            // Scale font sizes in CSS and inline styles
            scaledTemplate = scaledTemplate.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `font-size: ${scaledSize}px`
            })
            
            scaledTemplate = scaledTemplate.replace(/font-size:\s*(\d+(?:\.\d+)?)rem/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `font-size: ${scaledSize}rem`
            })
            
            scaledTemplate = scaledTemplate.replace(/font-size:\s*(\d+(?:\.\d+)?)em/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `font-size: ${scaledSize}em`
            })
            
            // Scale font sizes in inline styles within HTML elements
            scaledTemplate = scaledTemplate.replace(/style="([^"]*?)font-size:\s*(\d+(?:\.\d+)?)px([^"]*)"/g, (match, before, size, after) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `style="${before}font-size: ${scaledSize}px${after}"`
            })
            
            scaledTemplate = scaledTemplate.replace(/style="([^"]*?)font-size:\s*(\d+(?:\.\d+)?)rem([^"]*)"/g, (match, before, size, after) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `style="${before}font-size: ${scaledSize}rem${after}"`
            })
            
            scaledTemplate = scaledTemplate.replace(/style="([^"]*?)font-size:\s*(\d+(?:\.\d+)?)em([^"]*)"/g, (match, before, size, after) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `style="${before}font-size: ${scaledSize}em${after}"`
            })
            
            // Scale Tailwind font size classes
            const tailwindFontSizes = {
              'text-xs': 0.75,
              'text-sm': 0.875,
              'text-base': 1,
              'text-lg': 1.125,
              'text-xl': 1.25,
              'text-2xl': 1.5,
              'text-3xl': 1.875,
              'text-4xl': 2.25,
              'text-5xl': 3,
              'text-6xl': 3.75
            }
            
            // Add scaled font size CSS for Tailwind classes
            let tailwindScalingCSS = '\n/* Scaled Tailwind Font Sizes */\n'
            Object.entries(tailwindFontSizes).forEach(([className, baseSize]) => {
              const scaledSize = baseSize * resumeScale
              tailwindScalingCSS += `.${className} { font-size: ${scaledSize}rem !important; }\n`
            })
            
            // Insert the scaling CSS into the template
            if (scaledTemplate.includes('</style>')) {
              scaledTemplate = scaledTemplate.replace('</style>', tailwindScalingCSS + '</style>')
            } else if (scaledTemplate.includes('</head>')) {
              scaledTemplate = scaledTemplate.replace('</head>', `<style>${tailwindScalingCSS}</style></head>`)
            } else {
              scaledTemplate = scaledTemplate.replace('<body>', `<body><style>${tailwindScalingCSS}</style>`)
            }
            
            // Scale padding values
            scaledTemplate = scaledTemplate.replace(/padding:\s*(\d+(?:\.\d+)?)px/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `padding: ${scaledSize}px`
            })
            
            scaledTemplate = scaledTemplate.replace(/padding:\s*(\d+(?:\.\d+)?)rem/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `padding: ${scaledSize}rem`
            })
            
            scaledTemplate = scaledTemplate.replace(/padding-([a-z]+):\s*(\d+(?:\.\d+)?)px/g, (match, direction, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `padding-${direction}: ${scaledSize}px`
            })
            
            scaledTemplate = scaledTemplate.replace(/padding-([a-z]+):\s*(\d+(?:\.\d+)?)rem/g, (match, direction, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `padding-${direction}: ${scaledSize}rem`
            })
            
            // Scale margin values
            scaledTemplate = scaledTemplate.replace(/margin:\s*(\d+(?:\.\d+)?)px/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `margin: ${scaledSize}px`
            })
            
            scaledTemplate = scaledTemplate.replace(/margin:\s*(\d+(?:\.\d+)?)rem/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `margin: ${scaledSize}rem`
            })
            
            scaledTemplate = scaledTemplate.replace(/margin-([a-z]+):\s*(\d+(?:\.\d+)?)px/g, (match, direction, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `margin-${direction}: ${scaledSize}px`
            })
            
            scaledTemplate = scaledTemplate.replace(/margin-([a-z]+):\s*(\d+(?:\.\d+)?)rem/g, (match, direction, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `margin-${direction}: ${scaledSize}rem`
            })
            
            // Scale gap values
            scaledTemplate = scaledTemplate.replace(/gap:\s*(\d+(?:\.\d+)?)px/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `gap: ${scaledSize}px`
            })
            
            scaledTemplate = scaledTemplate.replace(/gap:\s*(\d+(?:\.\d+)?)rem/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `gap: ${scaledSize}rem`
            })
            
            // Scale line-height values (only numeric ones)
            scaledTemplate = scaledTemplate.replace(/line-height:\s*(\d+(?:\.\d+)?)px/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `line-height: ${scaledSize}px`
            })
            
            scaledTemplate = scaledTemplate.replace(/line-height:\s*(\d+(?:\.\d+)?)rem/g, (match, size) => {
              const scaledSize = parseFloat(size) * resumeScale
              return `line-height: ${scaledSize}rem`
            })
            
            // Remove height constraints and transforms that might prevent page flow
            scaledTemplate = scaledTemplate.replace(/height:\s*100vh/g, 'height: auto')
            scaledTemplate = scaledTemplate.replace(/min-height:\s*100vh/g, 'min-height: 0')
            scaledTemplate = scaledTemplate.replace(/max-height:\s*100vh/g, 'max-height: none')
            scaledTemplate = scaledTemplate.replace(/height:\s*\d+px/g, 'height: auto')
            scaledTemplate = scaledTemplate.replace(/min-height:\s*\d+px/g, 'min-height: 0')
            scaledTemplate = scaledTemplate.replace(/max-height:\s*\d+px/g, 'max-height: none')
            scaledTemplate = scaledTemplate.replace(/height:\s*\d+rem/g, 'height: auto')
            scaledTemplate = scaledTemplate.replace(/min-height:\s*\d+rem/g, 'min-height: 0')
            scaledTemplate = scaledTemplate.replace(/max-height:\s*\d+rem/g, 'max-height: none')
            scaledTemplate = scaledTemplate.replace(/transform:\s*scale\([^)]*\)/g, 'transform: none')
            scaledTemplate = scaledTemplate.replace(/zoom:\s*[^;]+/g, 'zoom: 1')
            scaledTemplate = scaledTemplate.replace(/overflow:\s*hidden/g, 'overflow: visible')
            
            return scaledTemplate
          }
          
          // Scaling already applied via addScalingCSS above
          // processedTemplate = scaleCustomTemplateCSS(processedTemplate) // DISABLED
        }
        
        // Only add PDF optimization CSS if we're using the fallback manual processing
        // If we got HTML from iframe, it already has proper styling applied
        const usingIframeContent = editableCustomResumeRef.current?.getHTMLContent()
        
        const customTemplatePDFCSS = usingIframeContent ? `
        /* Minimal PDF Print Optimization for iframe content */
        @media print {
          @page {
            margin: 0.5in !important;
            size: A4 !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            overflow: visible !important;
            transform: none !important;
            zoom: 1 !important;
          }
          
          body {
            width: 100% !important;
            height: auto !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        
        /* Default font scaling for elements without explicit sizes (always include for proper scaling) */
        body:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        p:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        div:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        span:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        li:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        td:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        th:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        h1:not([style*="font-size"]):not([class*="text-"]) { font-size: ${2 * resumeScale}rem !important; }
        h2:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1.5 * resumeScale}rem !important; }
        h3:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1.17 * resumeScale}rem !important; }
        h4:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        h5:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.83 * resumeScale}rem !important; }
        h6:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.67 * resumeScale}rem !important; }
        small:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.875 * resumeScale}rem !important; }
        strong:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        b:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        em:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        i:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        
        /* Tailwind font size classes scaling */
        .text-xs { font-size: ${0.75 * resumeScale}rem !important; }
        .text-sm { font-size: ${0.875 * resumeScale}rem !important; }
        .text-base { font-size: ${1 * resumeScale}rem !important; }
        .text-lg { font-size: ${1.125 * resumeScale}rem !important; }
        .text-xl { font-size: ${1.25 * resumeScale}rem !important; }
        .text-2xl { font-size: ${1.5 * resumeScale}rem !important; }
        .text-3xl { font-size: ${1.875 * resumeScale}rem !important; }
        .text-4xl { font-size: ${2.25 * resumeScale}rem !important; }
        .text-5xl { font-size: ${3 * resumeScale}rem !important; }
        .text-6xl { font-size: ${3.75 * resumeScale}rem !important; }
        ` : `
        /* PDF Print Optimization for Custom Templates */
        
        /* Default font scaling for elements without explicit sizes */
        body:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        p:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        div:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        span:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        li:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        td:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        th:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        h1:not([style*="font-size"]):not([class*="text-"]) { font-size: ${2 * resumeScale}rem !important; }
        h2:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1.5 * resumeScale}rem !important; }
        h3:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1.17 * resumeScale}rem !important; }
        h4:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        h5:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.83 * resumeScale}rem !important; }
        h6:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.67 * resumeScale}rem !important; }
        small:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.875 * resumeScale}rem !important; }
        strong:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        b:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        em:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        i:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
        
        @media print {
          @page {
            margin: 0.5in !important;
            size: A4 !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            overflow: visible !important;
            transform: none !important;
            zoom: 1 !important;
          }
          
          /* Ensure content flows naturally without artificial constraints */
          body {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            zoom: 1 !important;
            /* Remove any potential bottom spacing issues */
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }
          
          /* Allow line-by-line page breaks */
          * {
            page-break-inside: auto !important;
            break-inside: auto !important;
            overflow: visible !important;
            min-height: 0 !important;
            max-height: none !important;
            transform: none !important;
            zoom: 1 !important;
            orphans: 1 !important;
            widows: 1 !important;
          }
          
          /* Ensure containers don't constrain content and allow internal breaks */
          div, section, article, main, header, footer {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            zoom: 1 !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          
          /* Force line-by-line breaks for headings but allow content to flow */
          h1, h2, h3, h4, h5, h6 {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
            break-inside: avoid !important;
            break-after: auto !important;
            orphans: 2 !important;
            widows: 2 !important;
          }
          
          /* Allow natural breaks within text content */
          p, li, ul, ol, span, div {
            page-break-inside: auto !important;
            break-inside: auto !important;
            orphans: 1 !important;
            widows: 1 !important;
          }
          
          /* Specifically target resume sections to allow internal breaks */
          .resume-section,
          .experience-section,
          .education-section,
          .skills-section,
          .projects-section,
          div[class*="experience"],
          div[class*="education"],
          div[class*="skills"],
          div[class*="projects"],
          div[class*="section"],
          [data-allow-break="true"] {
            page-break-inside: auto !important;
            break-inside: auto !important;
            orphans: 1 !important;
            widows: 1 !important;
            contain: none !important;
            isolation: auto !important;
            display: block !important;
            position: static !important;
          }
          
          /* Ultra-aggressive approach for custom templates: flatten nested containers */
          .experience-section > div:not(:first-child),
          .education-section > div:not(:first-child),
          .projects-section > div:not(:first-child),
          .skills-section > div:not(:first-child),
          div[class*="experience"] > div:not(:first-child),
          div[class*="education"] > div:not(:first-child),
          div[class*="projects"] > div:not(:first-child),
          div[class*="skills"] > div:not(:first-child) {
            display: contents !important;
          }
          
          /* Make individual entries completely breakable */
          .mb-4, .mb-6, .mb-8,
          div[class*="border-b"], div[class*="border-t"],
          div[class*="job"], div[class*="work"],
          div[class*="education"], div[class*="school"],
          div[class*="project"], div[class*="certification"] {
            page-break-inside: auto !important;
            break-inside: auto !important;
            contain: none !important;
            isolation: auto !important;
            will-change: auto !important;
            transform: none !important;
            position: static !important;
            z-index: auto !important;
            display: block !important;
            overflow: visible !important;
          }
          
          /* Override any CSS that might prevent line-by-line breaks */
          .avoid-break,
          .no-break,
          [style*="page-break-inside: avoid"],
          [style*="break-inside: avoid"] {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          
          /* Ensure list items can break naturally */
          ul, ol {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          
          li {
            page-break-inside: auto !important;
            break-inside: auto !important;
            orphans: 1 !important;
            widows: 1 !important;
          }
          
          /* Allow breaks within job entries, education entries, etc. */
          .job-entry,
          .education-entry,
          .project-entry,
          .experience-item,
          .education-item,
          .project-item,
          div[class*="entry"],
          div[class*="item"] {
            page-break-inside: auto !important;
            break-inside: auto !important;
            orphans: 1 !important;
            widows: 1 !important;
          }
          
          /* Remove any viewport height constraints */
          [style*="height: 100vh"],
          [style*="height:100vh"],
          [style*="min-height: 100vh"],
          [style*="min-height:100vh"],
          [style*="max-height: 100vh"],
          [style*="max-height:100vh"] {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          
          /* Remove any transform scaling that might cause cropping */
          [style*="transform"],
          [style*="scale"] {
            transform: none !important;
            zoom: 1 !important;
          }
          
          /* Ensure natural page flow */
          .resume-container,
          .resume-content,
          .main-content,
          .content-wrapper,
          div[class*="container"],
          div[class*="wrapper"] {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            transform: none !important;
            zoom: 1 !important;
            display: block !important;
            position: static !important;
            contain: none !important;
            isolation: auto !important;
          }
          
          /* Force all layout containers to behave as normal block flow */
          .flex, 
          [style*="display: flex"], 
          [style*="display:flex"],
          [style*="display: grid"],
          [style*="display:grid"] {
            display: block !important;
            align-items: unset !important;
            justify-content: unset !important;
            flex-direction: unset !important;
            grid-template-columns: unset !important;
            grid-template-rows: unset !important;
          }
          
          /* Modern CSS for better page breaking */
          * {
            page: auto !important;
            break-inside: auto !important;
            break-before: auto !important;
            break-after: auto !important;
            column-break-inside: auto !important;
            -webkit-column-break-inside: auto !important;
            avoid-page-break-inside: auto !important;
            contain: none !important;
            isolation: auto !important;
          }
          
          /* Force normal document flow for problematic elements */
          body * {
            position: static !important;
            float: none !important;
            contain: none !important;
            isolation: auto !important;
            will-change: auto !important;
            transform: none !important;
            z-index: auto !important;
          }
          
          /* Exception for elements that should maintain their display type */
          span, em, strong, b, i, small, code, a {
            display: inline !important;
          }
          
          ul, ol {
            display: block !important;
          }
          
          li {
            display: list-item !important;
          }
        }
        
        /* Remove screen scaling for print */
        @media screen {
          html, body {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          * {
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }
        }
        `

        // Insert the minimal PDF optimization CSS into the template
        if (processedTemplate.includes('</style>')) {
          // Add to existing style block
          processedTemplate = processedTemplate.replace('</style>', customTemplatePDFCSS + '\n</style>')
        } else if (processedTemplate.includes('</head>')) {
          // Add new style block in head
          processedTemplate = processedTemplate.replace('</head>', `<style>${customTemplatePDFCSS}</style>\n</head>`)
        } else {
          // Fallback: add style block after opening body tag
          processedTemplate = processedTemplate.replace('<body>', `<body><style>${customTemplatePDFCSS}</style>`)
        }

        // Apply HTML preprocessing to custom templates for better page breaking
        // Temporarily disabled to test if this is causing spacing issues
        htmlContent = processedTemplate // improvePageBreaking(processedTemplate)
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

        // Create the default print document with unified scaling approach
        const cleanedCSS = createScaledCSS(allPageCSS) // Keep the scaled CSS as it has proper font/spacing scaling
        
        htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                ${cleanedCSS}
                
                /* Unified scaling approach - matches preview exactly */
                @media screen {
                  /* Screen preview scaling */
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    overflow: visible !important;
                    font-family: Arial, sans-serif;
                    line-height: 1.4;
                    color: #333;
                  }
                  
                  body {
                    transform: scale(${resumeScale}) !important;
                    transform-origin: top left !important;
                    width: ${100 / resumeScale}% !important;
                    height: auto !important;
                  }
                }
                
                @media print {
                  @page {
                    margin: 0.5in !important;
                    size: A4 !important;
                  }
                  
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    font-family: Arial, sans-serif;
                    line-height: 1.4;
                    color: #333;
                    background: white;
                  }
                  
                  /* PDF scaling to match preview behavior */
                  body {
                    transform: scale(${resumeScale}) !important;
                    transform-origin: top left !important;
                    width: ${100 / resumeScale}% !important;
                    height: auto !important;
                    /* Ensure content fits within A4 page bounds */
                    max-width: calc(210mm / ${resumeScale}) !important;
                  }
                  
                  /* Ensure all containers allow natural flow within the scaled body */
                  .bg-white.p-4.max-w-4xl.mx-auto {
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 15mm !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    box-sizing: border-box !important;
                    overflow: visible !important;
                  }
                  
                  /* Don't override body transform but clean up other elements */
                  *:not(body) {
                    min-height: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                  }
                  
                  /* Default font scaling for elements without explicit sizes */
                  body:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  p:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  div:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  span:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  li:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  td:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  th:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  h1:not([style*="font-size"]):not([class*="text-"]) { font-size: ${2 * resumeScale}rem !important; }
                  h2:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1.5 * resumeScale}rem !important; }
                  h3:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1.17 * resumeScale}rem !important; }
                  h4:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  h5:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.83 * resumeScale}rem !important; }
                  h6:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.67 * resumeScale}rem !important; }
                  small:not([style*="font-size"]):not([class*="text-"]) { font-size: ${0.875 * resumeScale}rem !important; }
                  strong:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  b:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  em:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  i:not([style*="font-size"]):not([class*="text-"]) { font-size: ${1 * resumeScale}rem !important; }
                  
                  .page-break {
                    page-break-before: always;
                  }
                  
                  h1, h2, h3, h4, h5, h6 {
                    page-break-after: avoid;
                    margin-top: 0.5rem !important;
                    margin-bottom: 0.5rem !important;
                  }
                  
                  /* Allow natural spacing - no overrides needed with transform scaling */
                  
                  .mb-4:last-child,
                  .mb-5:last-child,
                  .mb-6:last-child {
                    margin-bottom: 0;
                  }
                  
                  /* Override height constraints that might crop content */
                  div[style*="height"],
                  div[style*="max-height"] {
                    height: auto !important;
                    max-height: none !important;
                  }
                  
                  /* Allow content to flow naturally across pages with line-by-line breaks */
                  section, div, p, ul, li {
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    orphans: 1 !important;
                    widows: 1 !important;
                  }
                  
                  /* Headings should avoid breaking but allow content after them to flow */
                  h1, h2, h3, h4, h5, h6 {
                    page-break-inside: avoid !important;
                    page-break-after: auto !important;
                    break-inside: avoid !important;
                    break-after: auto !important;
                    orphans: 2 !important;
                    widows: 2 !important;
                  }
                  
                  /* Specifically target resume sections to allow internal breaks */
                  .resume-section,
                  .experience-section,
                  .education-section,
                  .skills-section,
                  .projects-section,
                  div[class*="experience"],
                  div[class*="education"],
                  div[class*="skills"],
                  div[class*="projects"],
                  div[class*="section"],
                  [data-allow-break="true"] {
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    orphans: 1 !important;
                    widows: 1 !important;
                    contain: none !important;
                    isolation: auto !important;
                  }
                  
                  /* Styling for page break hints */
                  .page-break-hint {
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    display: block !important;
                    overflow: visible !important;
                  }
                  
                  /* Enhanced break opportunities for common resume elements */
                  .mb-4 + *, .mb-6 + *, .mb-8 + *,
                  div[class*="entry"] + *, div[class*="item"] + *,
                  section + *, .section + * {
                    page-break-before: auto !important;
                    break-before: auto !important;
                    margin-top: 0.25rem !important;
                  }
                  
                  /* Force break opportunities by making large blocks splittable */
                  div[class*="mb-"], div[class*="py-"], div[class*="px-"],
                  .border-b, .border-t, .border,
                  div > div, li > div, td > div {
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    orphans: 1 !important;
                    widows: 1 !important;
                    contain: none !important;
                    will-change: auto !important;
                  }
                  
                  /* Override any CSS that might create stacking contexts and prevent breaks */
                  div[style*="z-index"], div[class*="z-"],
                  div[style*="position: relative"], div[style*="position:relative"],
                  div[style*="position: absolute"], div[style*="position:absolute"] {
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    contain: none !important;
                    isolation: auto !important;
                  }
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
      
      // For default templates, improve the HTML for better page breaking
      // Temporarily disabled to test if this is causing spacing issues
      /*if (!generatedContent.customHtmlTemplate) {
        htmlContent = htmlContent.replace(
          /<div class="bg-white p-4 max-w-4xl mx-auto">\s*([\s\S]*?)\s*<\/div>/,
          (match, content) => {
            const improvedContent = improvePageBreaking(content)
            return `<div class="bg-white p-4 max-w-4xl mx-auto">${improvedContent}</div>`
          }
        )
      }*/
      
      console.log("HTML content to write:", htmlContent.substring(0, 500))
      console.log("Full pdfOptimizationCSS:", pdfOptimizationCSS)
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      console.log("Document written and closed")
      
      // Only inject additional styles for default templates (custom templates already have their styles)
      if (!generatedContent.customHtmlTemplate) {
        const additionalStyle = printWindow.document.createElement('style')
        const cssContent = pdfOptimizationCSS.replace('<style>', '').replace('</style>', '')
        additionalStyle.textContent = cssContent
        printWindow.document.head.appendChild(additionalStyle)
        console.log("Additional styles injected for default template:", cssContent.substring(0, 200))
      } else {
        console.log("Skipping additional CSS injection for custom template")
      }
      
      // Debug: Check if classes exist in the document
      setTimeout(() => {
        const elementsWithClasses = printWindow.document.querySelectorAll('[class*="p-"], [class*="m-"], [class*="mb-"], [class*="mt-"]')
        console.log("Elements with spacing classes found:", elementsWithClasses.length)
        if (elementsWithClasses.length > 0) {
          console.log("First few elements:", Array.from(elementsWithClasses).slice(0, 3).map(el => ({
            tagName: el.tagName,
            className: el.className,
            computedStyle: {
              padding: printWindow.getComputedStyle(el).padding,
              margin: printWindow.getComputedStyle(el).margin
            }
          })))
        }
      }, 100)
      
      // Add JavaScript to force natural flow by removing problematic elements
      const script = printWindow.document.createElement('script')
      script.textContent = `
        // Remove any elements or attributes that might cause page breaks
        document.addEventListener('DOMContentLoaded', function() {
          console.log('DOM loaded, fixing page breaks and scaling...');
          
          // Remove all page-break related styles and transform scaling
          const allElements = document.querySelectorAll('*');
          allElements.forEach(el => {
            // Set appropriate page break styles for line-by-line flow
            if (el.tagName.match(/^H[1-6]$/)) {
              // Headings should avoid breaking but allow content after them to flow
              el.style.pageBreakInside = 'avoid';
              el.style.pageBreakAfter = 'auto';
              el.style.breakInside = 'avoid';
              el.style.breakAfter = 'auto';
            } else {
              // All other elements should allow natural breaks
              el.style.pageBreakBefore = 'auto';
              el.style.pageBreakAfter = 'auto';
              el.style.pageBreakInside = 'auto';
              el.style.breakBefore = 'auto';
              el.style.breakAfter = 'auto';
              el.style.breakInside = 'auto';
            }
            
            // Set orphans and widows for better text flow
            el.style.orphans = '1';
            el.style.widows = '1';
            
            // Remove transform scaling that causes cropping
            el.style.transform = 'none';
            el.style.zoom = '1';
            
            // Remove height constraints
            el.style.minHeight = '0';
            el.style.maxHeight = 'none';
            
            // Ensure overflow is visible
            el.style.overflow = 'visible';
            
            // Remove problematic classes
            if (el.className) {
              el.className = el.className.replace(/page-break[^\\s]*/g, '');
              el.className = el.className.replace(/break-[^\\s]*/g, '');
            }
            
            // Force block display for containers and ensure they allow internal breaks
            if (el.classList.contains('resume-container') || 
                el.classList.contains('left-column') || 
                el.classList.contains('right-column') ||
                el.classList.contains('sidebar') ||
                el.classList.contains('main-content') ||
                el.className.includes('section') ||
                el.className.includes('experience') ||
                el.className.includes('education') ||
                el.className.includes('skills') ||
                el.className.includes('projects')) {
              el.style.display = 'block';
              el.style.width = '100%';
              el.style.float = 'none';
              el.style.position = 'relative';
              el.style.transform = 'none';
              el.style.zoom = '1';
              // Ensure sections can break internally
              el.style.pageBreakInside = 'auto';
              el.style.breakInside = 'auto';
              el.style.orphans = '1';
              el.style.widows = '1';
            }
          });
          
          // Also fix html and body specifically
          document.documentElement.style.transform = 'none';
          document.documentElement.style.zoom = '1';
          document.documentElement.style.height = 'auto';
          document.documentElement.style.minHeight = '0';
          document.documentElement.style.maxHeight = 'none';
          
          document.body.style.transform = 'none';
          document.body.style.zoom = '1';
          document.body.style.height = 'auto';
          document.body.style.minHeight = '0';
          document.body.style.maxHeight = 'none';
          document.body.style.overflow = 'visible';
          
          // Apply font scaling to elements that might not have been caught by CSS
          const resumeScale = ${resumeScale};
          
          // Get all text-containing elements
          const textElements = document.querySelectorAll('*');
          textElements.forEach(el => {
            // Skip elements that are likely containers without direct text
            if (el.tagName === 'HTML' || el.tagName === 'HEAD' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') {
              return;
            }
            
            const computedStyle = window.getComputedStyle(el);
            const currentFontSize = parseFloat(computedStyle.fontSize);
            
            // Only scale if the element has text content and doesn't already have scaled font size
            if (currentFontSize && !el.hasAttribute('data-font-scaled') && el.textContent?.trim()) {
              // Check if element has explicit font-size, Tailwind text class, or already scaled CSS
              const hasExplicitSize = el.style.fontSize || 
                                    el.className.includes('text-') ||
                                    el.getAttribute('style')?.includes('font-size') ||
                                    currentFontSize !== 16; // 16px is default browser font size
              
              // For elements without explicit sizing, apply scaling
              if (!hasExplicitSize || resumeScale !== 1) {
                // Calculate appropriate scaled size based on element type
                let baseSize = currentFontSize;
                
                // Apply scaling
                const scaledSize = baseSize * resumeScale;
                el.style.fontSize = scaledSize + 'px';
                el.setAttribute('data-font-scaled', 'true');
              }
            }
          });
          
          console.log('Page break fixes, scaling removal, and font scaling applied');
        });
      `;
      printWindow.document.head.appendChild(script)
      console.log("Page break fix script injected")

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          // Try to set print margins programmatically (browser support varies)
          try {
            if (printWindow.document.body) {
              // Add a script to the print window to handle print settings
              const script = printWindow.document.createElement('script')
              script.textContent = `
                // Attempt to configure print settings
                window.addEventListener('beforeprint', function() {
                  console.log('Print dialog opening - margins should be set to None/Minimum');
                });
                
                // For Chrome/Edge - attempt to set print margins
                if (window.chrome && window.chrome.webstore) {
                  try {
                    // This is a hint for the browser's print dialog
                    document.body.style.margin = '0';
                    document.documentElement.style.margin = '0';
                  } catch (e) {
                    console.log('Could not set programmatic margins');
                  }
                }
              `
              printWindow.document.head.appendChild(script)
            }
          } catch (e) {
            console.log('Could not add print configuration script')
          }
          
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
      editableCustomResumeRef.current?.closeAllEditing()
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
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                  {isEditing ? "Exit Edit" : "Edit Resume"}
                </Button>
                {!isEditing && (
                  <div className="relative group">
                    <Button onClick={generatePDF} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      💡 Set margins to "None" in print dialog for best results
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Resume Scale Slider - Available for all resume templates */}
            <ResumeScaleSlider
              onScaleChange={setResumeScale}
              className="mb-4"
            />

            {/* A4 Size Guide - Only show for custom templates */}
            {generatedContent.customHtmlTemplate && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <div className="w-4 h-4 border border-dashed border-blue-400 rounded-sm flex-shrink-0"></div>
                  <span>The dashed rectangle shows A4 page boundaries. Use the scale slider to fit your content within this area.</span>
                </div>
              </div>
            )}

            <div className="border rounded-lg bg-gray-50">
              {generatedContent.customHtmlTemplate ? (
                // Show custom styled editable preview with A4 size indicator
                <div className="w-full relative p-4">
                  {/* A4 Size Indicator Rectangle with Fixed Dimensions */}
                  <div className="relative mx-auto bg-white shadow-sm" 
                       style={{ 
                         width: '210mm', 
                         height: '420mm', // Made taller to better accommodate content
                         maxWidth: '100%',
                         minHeight: '420mm'
                       }}>
                    {/* A4 Dimensions Border Indicator */}
                    <div 
                      className="absolute border-2 border-dashed border-blue-400 pointer-events-none z-10 transition-all duration-200"
                      style={{
                        top: 0,
                        left: 0,
                        width: '210mm',
                        height: '297mm', // Actual A4 height
                        backgroundColor: 'rgba(59, 130, 246, 0.03)'
                      }}
                    >
                      {/* Corner markers for better visibility */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-blue-500"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-blue-500"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-blue-500"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-blue-500"></div>
                      
                      {/* A4 Size Label */}
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-sm font-medium z-20">
                        📄 A4 Page (210×297mm)
                      </div>
                      {/* Scale indicator */}
                      <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-sm font-medium z-20">
                        🔍 {Math.round(resumeScale * 100)}%
                      </div>
                    </div>
                    
                    {/* Resume Content - Constrained to A4 bounds */}
                    <div className="relative z-0 w-full h-full">
                      <EditableCustomResumePreview
                        ref={editableCustomResumeRef}
                        htmlTemplate={generatedContent.customHtmlTemplate}
                        personalInfo={editedPersonalInfo}
                        resumeContent={editedResumeContent}
                        isEditing={isEditing}
                        onContentChange={(newContent) => setEditedResumeContent(newContent)}
                        onPersonalInfoChange={(newPersonalInfo) => setEditedPersonalInfo(newPersonalInfo)}
                        scale={resumeScale}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Show default editable template
                <div className="p-4" ref={resumeContentRef}>
                  <EditableResumeTemplate 
                    ref={editableResumeRef} 
                    resumeContent={editedResumeContent} 
                    personalInfo={editedPersonalInfo}
                    isEditing={isEditing}
                    onContentChange={(newContent) => setEditedResumeContent(newContent)}
                    onPersonalInfoChange={(newPersonalInfo) => setEditedPersonalInfo(newPersonalInfo)}
                    scale={resumeScale}
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
                      : "Click \"Download PDF\" to open the print dialog. Choose \"Save as PDF\" as your destination and set margins to \"None\" or \"Minimum\" for best results. Click \"Edit Resume\" to make changes."
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