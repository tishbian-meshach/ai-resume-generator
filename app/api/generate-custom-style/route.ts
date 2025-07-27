import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

interface CustomStyleRequestBody {
  resumeContent: string
  personalInfo: {
    fullName: string
    email: string
    phone: string
    location: string
    linkedIn: string
    portfolio: string
  }
  styleInstructions: string
  isSurpriseMe: boolean
  selectedModel: string
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
}

// Google Generative AI API configuration
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

// Function to get API URL based on selected model
const getGoogleAPIURL = (model: string) => {
  return `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GOOGLE_API_KEY}`
}

// Removed OpenRouter fallback configuration

// Function to ensure all required placeholders are present in the template
function ensureAllPlaceholders(htmlTemplate: string, missingPlaceholders: string[], resumeContent: string, personalInfo: any): string {
  console.log("Adding missing placeholders manually:", missingPlaceholders)
  
  // Create a basic template structure if the template is severely malformed
  if (missingPlaceholders.length >= 6 || htmlTemplate.length < 500) {
    console.log("Template appears to be severely malformed, creating basic structure")
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{FULL_NAME}} - Resume</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 2px solid #333;
            padding-bottom: 1rem;
        }
        .header h1 {
            margin: 0;
            font-size: 2rem;
            color: #2c3e50;
        }
        .contact-info {
            margin: 0.5rem 0;
            font-size: 0.9rem;
        }
        .contact-info a {
            color: #3498db;
            text-decoration: none;
        }
        .resume-content {
            margin-top: 1.5rem;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{FULL_NAME}}</h1>
        <div class="contact-info">
            <span>{{EMAIL}}</span> | 
            <span>{{PHONE}}</span> | 
            <span>{{LOCATION}}</span>
        </div>
        <div class="contact-info">
            <a href="{{LINKEDIN}}">LinkedIn</a> | 
            <a href="{{PORTFOLIO}}">Portfolio</a>
        </div>
    </div>
    
    <div class="resume-content">
        {{RESUME_CONTENT}}
    </div>
</body>
</html>`
  }
  
  // Try to add missing placeholders to existing template
  let updatedTemplate = htmlTemplate
  
  // Add missing placeholders in appropriate locations
  if (missingPlaceholders.includes('{{FULL_NAME}}')) {
    // Try to find a title or h1 tag to replace
    if (updatedTemplate.includes('<h1>') && !updatedTemplate.includes('{{FULL_NAME}}')) {
      updatedTemplate = updatedTemplate.replace(/<h1[^>]*>([^<]*)<\/h1>/, '<h1>{{FULL_NAME}}</h1>')
    } else if (updatedTemplate.includes('<title>')) {
      updatedTemplate = updatedTemplate.replace(/<title>([^<]*)<\/title>/, '<title>{{FULL_NAME}} - Resume</title>')
      // Also add h1 in body if not present
      if (!updatedTemplate.includes('<h1>')) {
        updatedTemplate = updatedTemplate.replace('<body>', '<body>\n    <h1>{{FULL_NAME}}</h1>')
      }
    }
  }
  
  // Add contact info placeholders
  const contactPlaceholders = ['{{EMAIL}}', '{{PHONE}}', '{{LOCATION}}', '{{LINKEDIN}}', '{{PORTFOLIO}}']
  const missingContactInfo = contactPlaceholders.filter(p => missingPlaceholders.includes(p))
  
  if (missingContactInfo.length > 0) {
    const contactSection = `
    <div class="contact-info">
        <span>{{EMAIL}}</span> | 
        <span>{{PHONE}}</span> | 
        <span>{{LOCATION}}</span>
    </div>
    <div class="contact-links">
        <a href="{{LINKEDIN}}">LinkedIn</a> | 
        <a href="{{PORTFOLIO}}">Portfolio</a>
    </div>`
    
    // Try to add after h1 or at the beginning of body
    if (updatedTemplate.includes('<h1>')) {
      updatedTemplate = updatedTemplate.replace('</h1>', '</h1>' + contactSection)
    } else {
      updatedTemplate = updatedTemplate.replace('<body>', '<body>' + contactSection)
    }
  }
  
  // Add resume content placeholder
  if (missingPlaceholders.includes('{{RESUME_CONTENT}}')) {
    // Add at the end of body before closing tag
    updatedTemplate = updatedTemplate.replace('</body>', '    <div class="resume-content">{{RESUME_CONTENT}}</div>\n</body>')
  }
  
  return updatedTemplate
}

// Function to validate the generated template
function validateTemplate(htmlTemplate: string, expectResumeContentPlaceholder: boolean = true): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check for required HTML structure
  if (!htmlTemplate.toLowerCase().includes('<!doctype html>')) {
    errors.push('Missing DOCTYPE declaration')
  }
  
  if (!htmlTemplate.toLowerCase().includes('<html')) {
    errors.push('Missing HTML tag')
  }
  
  if (!htmlTemplate.toLowerCase().includes('<head>')) {
    errors.push('Missing HEAD section')
  }
  
  if (!htmlTemplate.toLowerCase().includes('<body>')) {
    errors.push('Missing BODY section')
  }
  
  if (!htmlTemplate.toLowerCase().includes('</body>')) {
    errors.push('Missing closing BODY tag')
  }
  
  if (!htmlTemplate.toLowerCase().includes('</html>')) {
    errors.push('Missing closing HTML tag')
  }
  
  // Check for required placeholders (conditionally include RESUME_CONTENT)
  const requiredPlaceholders = ['{{FULL_NAME}}', '{{EMAIL}}', '{{PHONE}}', '{{LOCATION}}', '{{LINKEDIN}}', '{{PORTFOLIO}}']
  if (expectResumeContentPlaceholder) {
    requiredPlaceholders.push('{{RESUME_CONTENT}}')
  }
  
  const missingPlaceholders = requiredPlaceholders.filter(placeholder => !htmlTemplate.includes(placeholder))
  
  if (missingPlaceholders.length > 0) {
    errors.push(`Missing required placeholders: ${missingPlaceholders.join(', ')}`)
  }
  
  // Check for basic CSS styling
  if (!htmlTemplate.toLowerCase().includes('<style>') && !htmlTemplate.toLowerCase().includes('style=')) {
    errors.push('No CSS styling found')
  }
  
  // Check minimum template length (should be substantial)
  if (htmlTemplate.length < 1000) {
    errors.push('Template appears to be too short or incomplete')
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  }
}

// Function to ensure PDF-compatible spacing and styling
function ensurePDFCompatibleSpacing(htmlTemplate: string): string {
  // Add comprehensive PDF-specific CSS fixes
  const pdfSpacingFixes = `
    /* PDF Spacing Compatibility Fixes */
    * {
      box-sizing: border-box !important;
    }
    
    /* PDF print media query - apply height restrictions only for print */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      /* Force container dimensions for PDF only */
      .resume-container,
      .resume-container-two-col {
        height: 260mm !important;
        max-height: 260mm !important;
        overflow: hidden !important;
      }
      
      /* PDF-specific column sizing only */
      .left-column,
      .sidebar {
        height: 260mm !important;
        max-height: 260mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      
      .right-column,
      .main-content {
        height: 260mm !important;
        max-height: 260mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
    }
  `
  
  // Insert PDF spacing fixes
  if (htmlTemplate.includes('</style>')) {
    htmlTemplate = htmlTemplate.replace('</style>', pdfSpacingFixes + '\n</style>')
  }
  
  return htmlTemplate
}

// Function to optimize layout spacing and prevent white space issues
function optimizeLayoutSpacing(htmlTemplate: string): string {
  // Add CSS optimizations for A4 single-sheet layout
  const a4OptimizationCSS = `
    /* Auto-adjust for content overflow */
    .content-overflow {
      font-size: 10px !important;
      line-height: 1.2 !important;
    }
    
    .content-overflow h1 { font-size: 16px !important; margin-bottom: 3mm !important; }
    .content-overflow h2 { font-size: 13px !important; margin-bottom: 2mm !important; }
    .content-overflow h3 { font-size: 11px !important; margin-bottom: 1.5mm !important; }
    .content-overflow p { margin-bottom: 1mm !important; }
    .content-overflow ul, .content-overflow ol { margin-bottom: 2mm !important; }
    .content-overflow li { margin-bottom: 0.5mm !important; }
    
    /* Compact spacing for dense content */
    .compact-spacing section,
    .compact-spacing .section {
      margin-bottom: 3mm !important;
    }
    
    .compact-spacing h2 {
      margin-bottom: 2mm !important;
      margin-top: 3mm !important;
    }
    
    .compact-spacing p {
      margin-bottom: 1mm !important;
    }
    
    .compact-spacing ul, .compact-spacing ol {
      margin-bottom: 2mm !important;
      margin-left: 4mm !important;
    }
    
    .compact-spacing li {
      margin-bottom: 0.5mm !important;
    }
    
    /* Prevent page breaks within A4 constraints - PRINT ONLY */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      body {
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 15mm !important;
        box-sizing: border-box !important;
      }
      
      /* A4 Single-Sheet Optimization - PRINT ONLY */
      .resume-container, .resume-container-two-col {
        height: 260mm !important;
        max-height: 260mm !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        overflow: hidden !important;
      }
      
      /* Two-column layout optimizations - PRINT ONLY */
      .resume-container-two-col .left-column {
        height: 260mm !important;
        max-height: 260mm !important;
        overflow: hidden !important;
        padding: 8mm !important;
        box-sizing: border-box !important;
      }
      
      .resume-container-two-col .right-column {
        height: 260mm !important;
        max-height: 260mm !important;
        overflow: hidden !important;
        padding: 5mm 0 !important;
        box-sizing: border-box !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      
      section, .section {
        page-break-inside: avoid !important;
        margin-bottom: 3mm !important;
      }
      
      /* Minimal spacing fixes for PDF compatibility */
      section, .section {
        page-break-inside: avoid !important;
      }
    }
  `
  
  // Insert the A4 optimization CSS before the closing </style> tag
  if (htmlTemplate.includes('</style>')) {
    htmlTemplate = htmlTemplate.replace('</style>', a4OptimizationCSS + '\n</style>')
  }
  
  // If the template uses grid with unbalanced columns, suggest single column for print
  if (htmlTemplate.includes('grid-template-columns') && htmlTemplate.includes('1fr 2fr')) {
    const printOptimization = `
    @media print {
      .resume-container-two-col, .two-column-layout {
        display: block !important;
        grid-template-columns: none !important;
      }
      
      .left-column, .sidebar {
        width: 100% !important;
        margin-bottom: 1rem;
      }
      
      .right-column, .main-content {
        width: 100% !important;
      }
    }
    `
    
    if (htmlTemplate.includes('@media print')) {
      // Add to existing print media query
      htmlTemplate = htmlTemplate.replace('@media print {', '@media print {' + printOptimization)
    } else {
      // Add new print media query
      htmlTemplate = htmlTemplate.replace('</style>', printOptimization + '\n</style>')
    }
  }
  
  return htmlTemplate
}

// Function to detect if HTML template is incomplete and attempt to complete it
function detectAndCompleteTemplate(htmlTemplate: string, resumeContent: string, personalInfo: any): string {
  let processedHTML = htmlTemplate.trim()
  
  // Check if template is obviously incomplete
  const hasDoctype = processedHTML.toLowerCase().includes('<!doctype html>')
  const hasHtmlOpen = processedHTML.toLowerCase().includes('<html')
  const hasHead = processedHTML.toLowerCase().includes('<head>')
  const hasBodyOpen = processedHTML.toLowerCase().includes('<body>')
  const hasBodyClose = processedHTML.toLowerCase().includes('</body>')
  const hasHtmlClose = processedHTML.toLowerCase().includes('</html>')
  
  console.log("Template completeness check:", {
    hasDoctype,
    hasHtmlOpen,
    hasHead,
    hasBodyOpen,
    hasBodyClose,
    hasHtmlClose,
    length: processedHTML.length
  })
  
  // If template is severely incomplete (missing major structure), create a complete one
  if (!hasBodyClose || !hasHtmlClose || processedHTML.length < 1000) {
    console.log("Template appears incomplete, attempting to complete...")
    
    // If we have some content but it's incomplete, try to salvage what we can
    let salvageableContent = ""
    let salvageableStyles = ""
    
    // Extract any existing styles
    const styleMatch = processedHTML.match(/<style[^>]*>([\s\S]*?)(?:<\/style>|$)/i)
    if (styleMatch) {
      salvageableStyles = styleMatch[1]
    }
    
    // Extract any existing body content
    const bodyMatch = processedHTML.match(/<body[^>]*>([\s\S]*?)(?:<\/body>|$)/i)
    if (bodyMatch) {
      salvageableContent = bodyMatch[1]
    } else {
      // Look for any content after <body> tag
      const bodyStartMatch = processedHTML.match(/<body[^>]*>/i)
      if (bodyStartMatch) {
        const bodyStartIndex = processedHTML.indexOf(bodyStartMatch[0]) + bodyStartMatch[0].length
        salvageableContent = processedHTML.slice(bodyStartIndex)
      }
    }
    
    // Create a complete template with salvaged content
    const formattedResumeContent = resumeContent.split('\n').map(line => {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        return `        <div class="section">
            <h2>${trimmedLine.replace(/\*\*/g, '').trim()}</h2>
        </div>`
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
        return `            <li>${trimmedLine.substring(2)}</li>`
      } else if (trimmedLine) {
        return `            <p>${trimmedLine}</p>`
      }
      return ''
    }).join('\n')
    
    processedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{FULL_NAME}} - Resume</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.3;
            color: #333;
            width: 210mm;
            max-width: 210mm;
            height: 297mm;
            max-height: 297mm;
            margin: 0 auto;
            background: white;
            font-size: 11px;
            overflow: hidden;
            box-sizing: border-box;
        }
        
        .resume-content {
            height: 260mm;
            max-height: 260mm;
            overflow: hidden;
        }
        
        .header {
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 2px solid #333;
            padding-bottom: 1rem;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2rem;
            color: #2c3e50;
        }
        
        .contact-info {
            margin: 0.5rem 0;
            font-size: 0.9rem;
        }
        
        .contact-info a {
            color: #3498db;
            text-decoration: none;
        }
        
        .section {
            margin-bottom: 1.5rem;
        }
        
        .section h2 {
            font-size: 1.2rem;
            color: #2c3e50;
            border-bottom: 1px solid #ddd;
            padding-bottom: 0.3rem;
            margin-bottom: 0.8rem;
        }
        
        .resume-content {
            margin-top: 1.5rem;
        }
        
        .resume-content p {
            margin-bottom: 0.5rem;
        }
        
        .resume-content ul {
            margin-left: 1.5rem;
            margin-bottom: 1rem;
        }
        
        .resume-content li {
            margin-bottom: 0.3rem;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        ${salvageableStyles}
    </style>
</head>
<body>
    <div class="header">
        <h1>{{FULL_NAME}}</h1>
        <div class="contact-info">
            <span>{{EMAIL}}</span> | 
            <span>{{PHONE}}</span> | 
            <span>{{LOCATION}}</span>
        </div>
        <div class="contact-info">
            <a href="{{LINKEDIN}}">LinkedIn</a> | 
            <a href="{{PORTFOLIO}}">Portfolio</a>
        </div>
    </div>
    
    <div class="resume-content">
${salvageableContent || formattedResumeContent}
    </div>
</body>
</html>`
  } else if (!hasBodyClose) {
    // Template has structure but missing closing tags
    console.log("Adding missing closing tags...")
    if (!processedHTML.includes('</body>')) {
      processedHTML += '\n</body>'
    }
    if (!processedHTML.includes('</html>')) {
      processedHTML += '\n</html>'
    }
  }
  
  return processedHTML
}

// Function to ensure icons are properly embedded and work in both preview and PDF
function ensureInlineIcons(htmlTemplate: string): string {
  let processedHTML = htmlTemplate

  // Define inline SVG icons for common social media and contact elements
  const inlineIcons = {
    email: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 5px;"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 5px;"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
    location: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 5px;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    linkedin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 5px;"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    portfolio: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 5px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    website: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 5px;"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>'
  }

  // Remove external CDN links for icon fonts
  processedHTML = processedHTML.replace(/<link[^>]*font-?awesome[^>]*>/gi, '')
  processedHTML = processedHTML.replace(/<link[^>]*googleapis[^>]*icon[^>]*>/gi, '')
  processedHTML = processedHTML.replace(/<link[^>]*cdnjs[^>]*font-?awesome[^>]*>/gi, '')
  processedHTML = processedHTML.replace(/<script[^>]*font-?awesome[^>]*><\/script>/gi, '')
  processedHTML = processedHTML.replace(/<script[^>]*cdnjs[^>]*font-?awesome[^>]*><\/script>/gi, '')
  
  // Remove @import statements for external icon fonts
  processedHTML = processedHTML.replace(/@import\s+url\([^)]*font-?awesome[^)]*\);?/gi, '')
  processedHTML = processedHTML.replace(/@import\s+url\([^)]*googleapis[^)]*icon[^)]*\);?/gi, '')

  // Replace common Font Awesome classes with inline SVGs
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*fa[sr]?\s+fa-envelope[^"]*"[^>]*><\/i>/gi, inlineIcons.email)
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*fa[sr]?\s+fa-phone[^"]*"[^>]*><\/i>/gi, inlineIcons.phone)
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*fa[sr]?\s+fa-map-marker[^"]*"[^>]*><\/i>/gi, inlineIcons.location)
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*fa[sr]?\s+fa-linkedin[^"]*"[^>]*><\/i>/gi, inlineIcons.linkedin)
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*fa[sr]?\s+fa-globe[^"]*"[^>]*><\/i>/gi, inlineIcons.website)
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*fa[sr]?\s+fa-external-link[^"]*"[^>]*><\/i>/gi, inlineIcons.portfolio)
  
  // Also handle variations without fa prefix
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*envelope[^"]*"[^>]*><\/i>/gi, inlineIcons.email)
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*phone[^"]*"[^>]*><\/i>/gi, inlineIcons.phone)
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*location[^"]*"[^>]*><\/i>/gi, inlineIcons.location)
  processedHTML = processedHTML.replace(/<i[^>]*class="[^"]*linkedin[^"]*"[^>]*><\/i>/gi, inlineIcons.linkedin)
  
  // Handle span elements with icon classes
  processedHTML = processedHTML.replace(/<span[^>]*class="[^"]*fa[sr]?\s+fa-envelope[^"]*"[^>]*><\/span>/gi, inlineIcons.email)
  processedHTML = processedHTML.replace(/<span[^>]*class="[^"]*fa[sr]?\s+fa-phone[^"]*"[^>]*><\/span>/gi, inlineIcons.phone)
  processedHTML = processedHTML.replace(/<span[^>]*class="[^"]*fa[sr]?\s+fa-map-marker[^"]*"[^>]*><\/span>/gi, inlineIcons.location)
  processedHTML = processedHTML.replace(/<span[^>]*class="[^"]*fa[sr]?\s+fa-linkedin[^"]*"[^>]*><\/span>/gi, inlineIcons.linkedin)

  // Replace common text patterns with icons
  processedHTML = processedHTML.replace(/Email:/gi, inlineIcons.email + 'Email:')
  processedHTML = processedHTML.replace(/Phone:/gi, inlineIcons.phone + 'Phone:')
  processedHTML = processedHTML.replace(/Location:/gi, inlineIcons.location + 'Location:')
  processedHTML = processedHTML.replace(/LinkedIn:/gi, inlineIcons.linkedin + 'LinkedIn:')
  processedHTML = processedHTML.replace(/Portfolio:/gi, inlineIcons.portfolio + 'Portfolio:')
  processedHTML = processedHTML.replace(/Website:/gi, inlineIcons.website + 'Website:')

  // Add CSS for better icon styling if not present
  if (!processedHTML.includes('svg {') && processedHTML.includes('<svg')) {
    const iconCSS = `
    svg {
      display: inline-block;
      vertical-align: middle;
      margin-right: 5px;
    }
    .contact-info svg,
    .contact-links svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    `
    
    if (processedHTML.includes('</style>')) {
      processedHTML = processedHTML.replace('</style>', iconCSS + '\n</style>')
    }
  }

  return processedHTML
}

// Function to analyze content and suggest optimal layout
function analyzeContentForLayout(resumeContent: string): {
  recommendedLayout: 'single' | 'two-column',
  contentLength: 'short' | 'medium' | 'long',
  wordCount: number,
  suggestions: string
} {
  const wordCount = resumeContent.split(/\s+/).length
  const sectionCount = (resumeContent.match(/\*\*.*\*\*/g) || []).length
  
  let contentLength: 'short' | 'medium' | 'long'
  let recommendedLayout: 'single' | 'two-column'
  let suggestions: string
  
  if (wordCount < 400) {
    contentLength = 'short'
    recommendedLayout = 'single'
    suggestions = 'Use single-column with larger fonts and generous spacing for better readability'
  } else if (wordCount < 800) {
    contentLength = 'medium'
    recommendedLayout = 'two-column'
    suggestions = 'Two-column layout recommended for optimal space utilization'
  } else {
    contentLength = 'long'
    recommendedLayout = 'two-column'
    suggestions = 'Use compact two-column layout with optimized font sizes for content density'
  }
  
  return {
    recommendedLayout,
    contentLength,
    wordCount,
    suggestions
  }
}

// Removed OpenRouter fallback function

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
          maxOutputTokens: 16000,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Google API Error:", errorData)
      throw new Error(`Google API request failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Invalid response format from Google API")
    }

    return { result: data.candidates[0].content.parts[0].text, usedFallback: false }
  } catch (error) {
    console.error("Error calling Google Generative AI:", error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { resumeContent, personalInfo, styleInstructions, isSurpriseMe, selectedModel }: CustomStyleRequestBody = await req.json()
    
    // Track fallback usage
    let usedFallback = false

    // Validate required fields
    if (!resumeContent || (!isSurpriseMe && !styleInstructions) || !personalInfo.fullName) {
      return NextResponse.json(
        { error: "Missing required fields: resume content and personal info are required" },
        { status: 400 },
      )
    }

    // Validate selected model - only Gemini 2.5 Pro is allowed
    const validModels = ["gemini-2.5-pro"]
    if (!selectedModel || !validModels.includes(selectedModel)) {
      return NextResponse.json(
        { error: "Invalid model selected. Only gemini-2.5-pro is supported." },
        { status: 400 },
      )
    }

    console.log("Generating custom resume style with AI...")

    // Determine the style instructions based on mode
    let finalStyleInstructions = styleInstructions
    
    if (isSurpriseMe) {
      // Generate random creative style instructions
      const surpriseStyles = [
        "Creative modern design with vibrant teal and orange accents, unique typography mixing serif headers with sans-serif body text, asymmetrical layout with creative section dividers, professional yet artistic feel",
        "Elegant minimalist design with deep navy blue headers, gold accent lines, sophisticated serif font for headers and clean sans-serif for content, luxury professional appearance",
        "Bold contemporary style with bright coral accent color, geometric section dividers, modern sans-serif fonts, clean grid layout with subtle shadows and rounded corners",
        "Classic professional design with forest green accents, traditional serif fonts, clean borders and dividers, timeless business appearance with excellent readability",
        "Modern tech-inspired design with electric blue and gray color scheme, sleek sans-serif fonts, subtle gradients, clean lines and contemporary spacing",
        "Warm professional style with burgundy and cream colors, elegant typography, subtle texture backgrounds, sophisticated business appearance",
        "Fresh contemporary design with emerald green accents, modern mixed fonts, creative use of white space, professional yet approachable feel",
        "Sophisticated corporate style with charcoal gray and silver accents, premium typography, clean geometric elements, executive-level professional appearance"
      ]
      
      finalStyleInstructions = surpriseStyles[Math.floor(Math.random() * surpriseStyles.length)]
      console.log("Surprise Me style selected:", finalStyleInstructions)
    }

    // Analyze content for optimal layout
    const contentAnalysis = analyzeContentForLayout(resumeContent)
    console.log("Content analysis for layout:", contentAnalysis)

    // Single Responsive Template Generation Prompt
    const customStylePrompt = `
You are an expert web developer and designer specializing in creating beautiful, professional resume templates. You MUST generate ONE optimal template that displays all content without size restrictions.

CONTENT ANALYSIS:
- Word Count: ${contentAnalysis.wordCount} words
- Content Length: ${contentAnalysis.contentLength}
- Recommended Layout: ${contentAnalysis.recommendedLayout}
- Layout Guidance: ${contentAnalysis.suggestions}

RESUME CONTENT TO STYLE:
${resumeContent}

PERSONAL INFORMATION:
- Name: ${personalInfo.fullName}
- Email: ${personalInfo.email}
- Phone: ${personalInfo.phone}
- Location: ${personalInfo.location}
- LinkedIn: ${personalInfo.linkedIn}
- Portfolio: ${personalInfo.portfolio}

STYLE INSTRUCTIONS:
${finalStyleInstructions}

${isSurpriseMe ? 'MODE: SURPRISE ME - Be creative and unique while maintaining professionalism!' : 'MODE: CUSTOM INSTRUCTIONS - Follow the user\'s specific requirements.'}

CRITICAL: You must return a JSON object with the following structure:
{
  "htmlTemplate": "COMPLETE HTML DOCUMENT WITH RESPONSIVE CLASSES HERE",
  "defaultOption": "standard"
}

ABSOLUTE REQUIREMENTS - FAILURE TO FOLLOW WILL RESULT IN REJECTION:

1. JSON RESPONSE FORMAT:
   - Return ONLY valid JSON in the exact structure shown above
   - No additional text, explanations, or markdown formatting
   - Must include htmlTemplate and defaultOption fields

2. CSS CLASSES:
   - Use semantic class names: .name-header, .section-header, .body-text, .contact-info
   - No responsive prefixes needed - use standard CSS
   - Example: class="name-header", class="section-header", class="body-text"

3. OPTIMAL SIZING STRATEGY:
   - Generate ONE optimal template with balanced font sizes and spacing
   - Use standard font sizes: 14px for body text, 18px for h2, 22px for h1
   - Use balanced spacing: 12px margins, 16px padding, 1.4 line-height
   - Focus on creating the best possible layout that can be scaled if needed

4. FONT AND SPACING GUIDELINES:
   - Body text: 14px font-size, 1.4 line-height
   - H1 (name): 22px font-size, 1.3 line-height
   - H2 (sections): 18px font-size, 1.3 line-height
   - H3 (subsections): 16px font-size, 1.3 line-height
   - Margins: 12px between sections, 8px between items
   - Padding: 16px for containers, 8px for smaller elements

5. LAYOUT REQUIREMENTS:
   - Use standard CSS classes without responsive prefixes
   - Focus on creating a well-balanced, professional layout
   - Ensure proper hierarchy with font sizes and spacing
   - Example: <h1 class="name-header">{{FULL_NAME}}</h1>
   - Example: <p class="body-text">Content here</p>

6. MANDATORY PLACEHOLDER INTEGRATION:
   - {{FULL_NAME}} - REQUIRED: for the person's name (use in <h1> or title)
   - {{EMAIL}} - REQUIRED: for email address (use in contact section)
   - {{PHONE}} - REQUIRED: for phone number (use in contact section)
   - {{LOCATION}} - REQUIRED: for location (use in contact section)
   - {{LINKEDIN}} - REQUIRED: for LinkedIn URL (use as clickable link)
   - {{PORTFOLIO}} - REQUIRED: for portfolio URL (use as clickable link)
   
   CRITICAL CONTENT INSTRUCTION: 
   - DO NOT include the {{RESUME_CONTENT}} placeholder in your template
   - Instead, directly incorporate and style the actual resume content provided above
   - Transform the raw resume content into beautifully styled HTML sections with responsive classes
   - Apply responsive classes to ALL content elements

7. ENHANCED STYLING REQUIREMENTS:
   - Interpret the user's style instructions while prioritizing space optimization
   - Create modern, ATS-friendly designs with balanced layouts
   - Ensure excellent print compatibility (use print media queries)
   - Use professional color schemes and typography
   - Make it visually appealing while maintaining readability and space efficiency
   - Ensure proper spacing and layout for PDF generation without waste

8. CONTENT INTEGRATION AND STYLING:
   - Transform the provided resume content into beautifully styled HTML sections
   - Preserve all sections, bullet points, and information from the original content
   - Convert plain text sections into proper HTML structure (headings, lists, paragraphs)
   - Enhance the visual presentation through CSS styling while keeping all content
   - Keep all professional experience, skills, education, etc. exactly as provided
   - Organize content intelligently to minimize white space

9. CONTENT GENERATION (CRITICAL):
   - Generate FULL content without size restrictions - scaling will be handled separately
   - You have FULL CONTROL over all margins, padding, and spacing
   - Design your own margin system - no forced margins will be applied
   - Let content flow naturally without height restrictions
   - Focus on creating comprehensive, well-formatted content
     * Reduce font sizes (minimum 9px for body text, 11px for headings)
     * Decrease line spacing (minimum 1.2)
     * Adjust YOUR spacing system as needed
     * Prioritize content density over white space
   - Include print-specific CSS for professional printing
   - Use CSS to prevent page breaks and ensure single-page layout
   - CRITICAL: Use !important declarations for critical layout rules only
   - You control ALL styling - no external CSS will override your design

10. PROFESSIONAL STANDARDS:
    - Use web-safe fonts with fallbacks
    - Ensure high contrast for readability
    - Follow modern design principles with space efficiency in mind
    - Make it suitable for professional environments
    - Prioritize content visibility over decorative white space

11. ICON AND VISUAL ELEMENTS REQUIREMENTS:
    - DO NOT use external icon libraries (Font Awesome, Google Icons, etc.)
    - Use inline SVG icons for social media and contact icons
    - Create CSS-based icons using Unicode symbols or pseudo-elements
    - Ensure all visual elements are self-contained within the HTML document
    - Icons must work in both iframe preview and PDF generation
    - Example inline SVG for email: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
    - Example CSS icon: .icon-phone::before { content: "📞"; margin-right: 5px; }

LAYOUT RECOMMENDATIONS BASED ON CONTENT:

FOR SINGLE-COLUMN LAYOUTS (RECOMMENDED FOR MOST CASES):
- Header with contact info at top
- Sections flow vertically with consistent spacing
- No risk of unbalanced columns or white space
- Easy to read and ATS-friendly
- Professional and clean appearance

FOR TWO-COLUMN LAYOUTS (RECOMMENDED FOR MODERN DESIGN):
- Left sidebar (30-35%): Contact info, Skills, Certifications, Education, Languages
- Right main area (65-70%): Professional Summary, Experience, Projects
- Use background colors or subtle borders to create visual distinction
- Ensure content distribution is well-organized and readable
- Perfect for resumes with diverse skill sets and multiple sections
- Creates professional, modern appearance with excellent readability

EXAMPLE RESPONSIVE TEMPLATE STRUCTURE:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{FULL_NAME}} - Resume</title>
    <style>
        /* Professional Resume CSS */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            color: #333;
            margin: 0 auto;
            background: white;
            box-sizing: border-box;
        }
        
        /* Optimal CSS Classes */
        .name-header { font-size: 22px; line-height: 1.3; margin-bottom: 12px; font-weight: bold; }
        .section-header { font-size: 18px; line-height: 1.3; margin-bottom: 8px; font-weight: 600; }
        .body-text { font-size: 14px; line-height: 1.4; margin-bottom: 8px; }
        .contact-info { font-size: 14px; line-height: 1.4; margin-bottom: 12px; }
        .resume-container { padding: 16px; margin: 0 auto; }
        .section { margin-bottom: 12px; }
        .resume-list { margin: 8px 0; padding-left: 20px; }
        .resume-list li { margin-bottom: 4px; font-size: 14px; line-height: 1.4; }
        
        /* Container */
        .resume-container {
            height: 260mm;
            max-height: 260mm;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <div class="resume-container">
        <header>
            <h1 class="name-header">{{FULL_NAME}}</h1>
            <div class="contact-info">
                <span>{{EMAIL}}</span> | <span>{{PHONE}}</span> | <span>{{LOCATION}}</span>
            </div>
        </header>
        
        <!-- Use standard semantic classes -->
        <section class="section">
            <h2 class="section-header">Section Title</h2>
            <p class="body-text">Content here...</p>
            <ul class="resume-list">
                <li>List item with standard styling</li>
            </ul>
        </section>
    </div>
</body>
</html>
\`\`\`

IMPORTANT: Include ALL responsive utility classes in your CSS and apply them throughout your HTML structure.

CRITICAL FINAL REQUIREMENTS - MANDATORY COMPLIANCE:

⚠️ COMPLETION REQUIREMENT: You MUST generate the COMPLETE HTML document from start to finish. Do NOT stop in the middle, do NOT truncate, do NOT leave incomplete. The response must end with </html>.

- Return ONLY the complete HTML code, no explanations or markdown formatting
- MUST include these 6 required placeholders: {{FULL_NAME}}, {{EMAIL}}, {{PHONE}}, {{LOCATION}}, {{LINKEDIN}}, {{PORTFOLIO}}
- DO NOT include {{RESUME_CONTENT}} placeholder - integrate the content directly into styled HTML
- USE ONLY inline SVG icons or CSS-based icons - NO external CDN links (Font Awesome, Google Icons, etc.)
- All visual elements must be self-contained within the HTML document
- Icons must work in both iframe preview and PDF generation
- Ensure the HTML is valid and well-structured with proper opening and closing tags
- The design should reflect the style instructions while prioritizing space optimization
- Focus on creating a visually stunning yet space-efficient professional resume template
- AVOID layouts that create excessive white space or unbalanced columns
- MUST generate the complete document - do not stop in the middle or truncate
- Include proper DOCTYPE, html, head, and body structure
- End with proper closing </body> and </html> tags
- Template must be fully functional with all content beautifully styled

🔴 CRITICAL: Your response must be COMPLETE. If you reach any token limit, prioritize completing the HTML structure over complex styling. The template MUST end with </body></html>.

📄 PDF COMPATIBILITY REQUIREMENTS (MANDATORY):
- Use !important declarations for critical layout rules only
- Ensure your custom styling works in both preview AND PDF output
- Background colors and visual elements must work in PDF generation
- You have full control over all padding, margins, and styling
- Do not rely on external CSS - all styles must be embedded

VALIDATION CHECKLIST - VERIFY YOUR OUTPUT INCLUDES:
✓ DOCTYPE html declaration
✓ Complete <html>, <head>, and <body> structure
✓ 6 required placeholders exactly as specified (NOT including {{RESUME_CONTENT}})
✓ Resume content directly integrated and styled in HTML
✓ Embedded CSS styles in <style> tag with ALL responsive utility classes
✓ Professional styling based on instructions
✓ Inline SVG icons or CSS-based icons (NO external CDN links)
✓ Self-contained visual elements that work in iframe and PDF
✓ Proper closing </body> and </html> tags

Generate the COMPLETE HTML template now (from DOCTYPE to closing HTML tag):
`

    // Generate custom styled resume with multiple options
    let styleResponse = await generateWithGemini(customStylePrompt, selectedModel)
    if (styleResponse.usedFallback) usedFallback = true

    // Clean up the response to ensure we get only JSON
    let jsonResponse = styleResponse.result.trim()
    
    // Remove markdown code blocks if present
    jsonResponse = jsonResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    interface SingleTemplateResponse {
      htmlTemplate: string
      defaultOption: string
    }

    let singleTemplateResponse: SingleTemplateResponse
    let multiStyleResponse: MultiStyleResponse
    
    try {
      // Check if response is truncated
      if (!jsonResponse.trim().endsWith('}')) {
        console.log("Response appears truncated, attempting to fix...")
        // Try to find the last complete part and close it
        const lastCompleteIndex = jsonResponse.lastIndexOf('"')
        if (lastCompleteIndex > 0) {
          jsonResponse = jsonResponse.substring(0, lastCompleteIndex) + '"}\n}'
        }
      }

      // Parse the JSON response for single template
      singleTemplateResponse = JSON.parse(jsonResponse)
      
      // Validate the response structure
      if (!singleTemplateResponse.htmlTemplate || !singleTemplateResponse.defaultOption) {
        throw new Error('Invalid response structure: expected htmlTemplate and defaultOption')
      }
      
      // Convert single template to multi-style format for compatibility
      multiStyleResponse = {
        options: [
          {
            id: "compact",
            name: "Compact Layout",
            description: "Smaller fonts and tight spacing for content-heavy resumes",
            htmlTemplate: singleTemplateResponse.htmlTemplate,
            targetHeight: "260mm",
            fontSizes: {
              h1: "18px",
              h2: "14px",
              h3: "12px",
              body: "10px"
            },
            spacing: {
              sectionMargin: "8px",
              lineHeight: "1.2",
              padding: "4px"
            },
            layout: {
              type: "single-column",
              columns: "1fr",
              gap: "8px"
            }
          },
          {
            id: "standard",
            name: "Standard Layout",
            description: "Balanced fonts and spacing for normal content length",
            htmlTemplate: singleTemplateResponse.htmlTemplate,
            targetHeight: "260mm",
            fontSizes: {
              h1: "22px",
              h2: "16px",
              h3: "14px",
              body: "12px"
            },
            spacing: {
              sectionMargin: "12px",
              lineHeight: "1.4",
              padding: "8px"
            },
            layout: {
              type: "single-column",
              columns: "1fr",
              gap: "12px"
            }
          },
          {
            id: "spacious",
            name: "Spacious Layout",
            description: "Larger fonts and generous spacing for shorter content",
            htmlTemplate: singleTemplateResponse.htmlTemplate,
            targetHeight: "260mm",
            fontSizes: {
              h1: "26px",
              h2: "18px",
              h3: "16px",
              body: "14px"
            },
            spacing: {
              sectionMargin: "16px",
              lineHeight: "1.6",
              padding: "12px"
            },
            layout: {
              type: "two-column",
              columns: "1fr 2fr",
              gap: "16px"
            }
          }
        ],
        defaultOption: singleTemplateResponse.defaultOption
      }
      
      console.log("Successfully parsed single responsive template")
      
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError)
      console.log("Raw response length:", jsonResponse.length)
      console.log("Response ends with:", jsonResponse.slice(-100))
      
      // Try to extract HTML from malformed JSON
      const htmlMatch = jsonResponse.match(/"htmlTemplate":\s*"(.*?)(?="[,}])/)
      if (htmlMatch && htmlMatch[1]) {
        console.log("Extracted HTML from malformed JSON")
        const extractedHTML = htmlMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
        
        multiStyleResponse = {
          options: [{
            id: "optimal",
            name: "Optimal Layout", 
            description: "AI-generated optimal layout",
            htmlTemplate: extractedHTML,
            targetHeight: "297mm",
            fontSizes: { h1: "22px", h2: "18px", h3: "16px", body: "14px" },
            spacing: { sectionMargin: "12px", lineHeight: "1.4", padding: "16px" },
            layout: { type: 'single-column' as const }
          }],
          defaultOption: "optimal"
        }
        
        console.log("Successfully recovered template from malformed JSON")
      } else {
        console.log("Could not extract HTML, using fallback generation")
        
        // Fallback to simple template generation
        const fallbackPrompt = `Generate a COMPLETE HTML resume template. Return ONLY the HTML code, no JSON, no explanations.

RESUME CONTENT TO STYLE:
${resumeContent}

PERSONAL INFO:
- Name: ${personalInfo.fullName}
- Email: ${personalInfo.email}
- Phone: ${personalInfo.phone}
- Location: ${personalInfo.location}
- LinkedIn: ${personalInfo.linkedIn}
- Portfolio: ${personalInfo.portfolio}

STYLE: ${finalStyleInstructions}

REQUIREMENTS:
1. Generate COMPLETE HTML from <!DOCTYPE html> to </html>
2. Include placeholders: {{FULL_NAME}}, {{EMAIL}}, {{PHONE}}, {{LOCATION}}, {{LINKEDIN}}, {{PORTFOLIO}}
3. Style the resume content directly in the HTML
4. Use inline SVG icons only
5. Professional styling with embedded CSS
6. MUST be complete - do not truncate

Generate the complete HTML now:`

      const fallbackResponse = await generateWithGemini(fallbackPrompt, selectedModel)
      if (fallbackResponse.usedFallback) usedFallback = true
      
      let htmlTemplate = fallbackResponse.result.trim()
      htmlTemplate = htmlTemplate.replace(/```html\n?/g, '').replace(/```\n?/g, '')
      
      // Create a single option response
      multiStyleResponse = {
        options: [{
          id: "standard",
          name: "Standard Layout",
          description: "Balanced fonts and spacing for normal content length",
          htmlTemplate: htmlTemplate,
          targetHeight: "260mm",
          fontSizes: {
            h1: "22px",
            h2: "16px",
            h3: "14px",
            body: "12px"
          },
          spacing: {
            sectionMargin: "12px",
            lineHeight: "1.4",
            padding: "8px"
          },
          layout: {
            type: "single-column",
            columns: "1fr",
            gap: "12px"
          }
        }],
        defaultOption: "standard"
      }
    }
  }
    
    // Process each template option
    for (let i = 0; i < multiStyleResponse.options.length; i++) {
      const option = multiStyleResponse.options[i]
      let htmlTemplate = option.htmlTemplate
      
      // Check if template is severely incomplete and needs completion
      const isIncomplete = !htmlTemplate.toLowerCase().includes('</body>') || 
                          !htmlTemplate.toLowerCase().includes('</html>') || 
                          htmlTemplate.length < 1000
      
      if (isIncomplete) {
        console.log(`Template ${option.id} appears incomplete, attempting completion...`)
        htmlTemplate = detectAndCompleteTemplate(htmlTemplate, resumeContent, personalInfo)
      } else {
        // Template looks complete, but still run completion check for safety
        htmlTemplate = detectAndCompleteTemplate(htmlTemplate, resumeContent, personalInfo)
      }
      
      // Ensure it starts with DOCTYPE
      if (!htmlTemplate.toLowerCase().includes('<!doctype html>')) {
        console.log(`Adding DOCTYPE to template ${option.id}`)
        htmlTemplate = '<!DOCTYPE html>\n' + htmlTemplate
      }

      // Ensure it ends with proper closing tags
      if (!htmlTemplate.toLowerCase().includes('</html>')) {
        console.log(`Adding missing closing HTML tag to template ${option.id}`)
        if (!htmlTemplate.toLowerCase().includes('</body>')) {
          htmlTemplate += '\n</body>'
        }
        htmlTemplate += '\n</html>'
      }

      // Validate that all required placeholders are present
      const requiredPlaceholders = ['{{FULL_NAME}}', '{{EMAIL}}', '{{PHONE}}', '{{LOCATION}}', '{{LINKEDIN}}', '{{PORTFOLIO}}']
      const missingPlaceholders = requiredPlaceholders.filter(placeholder => !htmlTemplate.includes(placeholder))
      
      if (missingPlaceholders.length > 0) {
        console.warn(`Template ${option.id} missing placeholders:`, missingPlaceholders)
        // Add missing placeholders manually
        htmlTemplate = ensureAllPlaceholders(htmlTemplate, [...missingPlaceholders, '{{RESUME_CONTENT}}'], resumeContent, personalInfo)
      }

      // Post-process HTML for better space optimization
      htmlTemplate = optimizeLayoutSpacing(htmlTemplate)

      // Ensure icons are properly embedded and work in both preview and PDF
      htmlTemplate = ensureInlineIcons(htmlTemplate)
      
      // Ensure PDF-compatible spacing and styling
      htmlTemplate = ensurePDFCompatibleSpacing(htmlTemplate)
      
      // Fix escaped CSS selectors (remove backslashes from CSS)
      htmlTemplate = htmlTemplate.replace(/\\:/g, ':')

      // Update the option with the processed template
      multiStyleResponse.options[i].htmlTemplate = htmlTemplate
    }

    console.log("Multi-style resume templates generated successfully")
    console.log("Generated", multiStyleResponse.options.length, "template options")
    
    // Log template lengths for debugging
    multiStyleResponse.options.forEach(option => {
      console.log(`Template ${option.id} length:`, option.htmlTemplate.length)
    })

    return NextResponse.json({
      ...multiStyleResponse,
      usedFallback: usedFallback,
    })
  } catch (error) {
    console.error("Error generating custom style:", error)
    return NextResponse.json(
      { error: "Failed to generate custom resume style. Please try again." },
      { status: 500 },
    )
  }
}

