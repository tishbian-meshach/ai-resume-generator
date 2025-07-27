/**
 * Utility functions for handling responsive resume templates with size variants
 */

export type SizeVariant = 'sm' | 'md' | 'lg'

export interface ResponsiveTemplate {
  htmlTemplate: string
  selectedVariant: SizeVariant
}

/**
 * Process HTML template to show only classes for the selected size variant
 * @param htmlTemplate - The HTML template with responsive classes
 * @param selectedVariant - The size variant to show ('sm', 'md', 'lg')
 * @returns Processed HTML with only relevant classes
 */
export function processResponsiveTemplate(htmlTemplate: string, selectedVariant: SizeVariant): string {
  let processedHTML = htmlTemplate

  // First, fix escaped CSS selectors in the style block (remove backslashes)
  processedHTML = processedHTML.replace(/\\:/g, ':')

  // Define all possible variants
  const allVariants: SizeVariant[] = ['sm', 'md', 'lg']
  
  // Remove classes for other variants
  const otherVariants = allVariants.filter(variant => variant !== selectedVariant)
  
  otherVariants.forEach(variant => {
    // Remove variant-specific classes using regex
    // Matches patterns like: sm:text-xs, md:text-sm, lg:text-base, etc.
    const variantClassRegex = new RegExp(`\\b${variant}:[\\w-]+`, 'g')
    processedHTML = processedHTML.replace(variantClassRegex, '')
  })

  // Clean up the selected variant prefix (e.g., "sm:text-xs" becomes "text-xs")
  const selectedVariantRegex = new RegExp(`\\b${selectedVariant}:([\\w-]+)`, 'g')
  processedHTML = processedHTML.replace(selectedVariantRegex, '$1')

  // Clean up multiple spaces and empty class attributes
  processedHTML = processedHTML.replace(/class="[\s]+"/g, 'class=""')
  processedHTML = processedHTML.replace(/class="([^"]*?)[\s]+([^"]*?)"/g, 'class="$1 $2"')
  processedHTML = processedHTML.replace(/\s+/g, ' ')

  return processedHTML
}

/**
 * Get size variant configuration
 */
export function getSizeVariantConfig(variant: SizeVariant) {
  const configs = {
    sm: {
      id: 'compact',
      name: 'Compact Layout',
      description: 'Smaller fonts and tight spacing for content-heavy resumes',
      targetHeight: '260mm',
      fontSizes: {
        h1: '18px',
        h2: '14px',
        h3: '12px',
        body: '10px'
      },
      spacing: {
        sectionMargin: '8px',
        lineHeight: '1.2',
        padding: '4px'
      },
      layout: {
        type: 'single-column' as const,
        columns: '1fr',
        gap: '8px'
      }
    },
    md: {
      id: 'standard',
      name: 'Standard Layout',
      description: 'Balanced fonts and spacing for normal content length',
      targetHeight: '260mm',
      fontSizes: {
        h1: '22px',
        h2: '16px',
        h3: '14px',
        body: '12px'
      },
      spacing: {
        sectionMargin: '12px',
        lineHeight: '1.4',
        padding: '8px'
      },
      layout: {
        type: 'single-column' as const,
        columns: '1fr',
        gap: '12px'
      }
    },
    lg: {
      id: 'spacious',
      name: 'Spacious Layout',
      description: 'Larger fonts and generous spacing for shorter content',
      targetHeight: '260mm',
      fontSizes: {
        h1: '26px',
        h2: '18px',
        h3: '16px',
        body: '14px'
      },
      spacing: {
        sectionMargin: '16px',
        lineHeight: '1.6',
        padding: '12px'
      },
      layout: {
        type: 'two-column' as const,
        columns: '1fr 2fr',
        gap: '16px'
      }
    }
  }

  return configs[variant]
}

/**
 * Generate responsive CSS classes for different size variants
 */
export function generateResponsiveCSS(): string {
  return `
    /* Base responsive utility classes */
    
    /* Font sizes */
    .sm\\:text-xs { font-size: 10px; }
    .sm\\:text-sm { font-size: 11px; }
    .sm\\:text-base { font-size: 12px; }
    .sm\\:text-lg { font-size: 14px; }
    .sm\\:text-xl { font-size: 16px; }
    .sm\\:text-2xl { font-size: 18px; }
    
    .md\\:text-xs { font-size: 11px; }
    .md\\:text-sm { font-size: 12px; }
    .md\\:text-base { font-size: 14px; }
    .md\\:text-lg { font-size: 16px; }
    .md\\:text-xl { font-size: 18px; }
    .md\\:text-2xl { font-size: 22px; }
    
    .lg\\:text-xs { font-size: 12px; }
    .lg\\:text-sm { font-size: 14px; }
    .lg\\:text-base { font-size: 16px; }
    .lg\\:text-lg { font-size: 18px; }
    .lg\\:text-xl { font-size: 20px; }
    .lg\\:text-2xl { font-size: 26px; }
    
    /* Line heights */
    .sm\\:leading-tight { line-height: 1.2; }
    .sm\\:leading-normal { line-height: 1.3; }
    .sm\\:leading-relaxed { line-height: 1.4; }
    
    .md\\:leading-tight { line-height: 1.3; }
    .md\\:leading-normal { line-height: 1.4; }
    .md\\:leading-relaxed { line-height: 1.5; }
    
    .lg\\:leading-tight { line-height: 1.4; }
    .lg\\:leading-normal { line-height: 1.5; }
    .lg\\:leading-relaxed { line-height: 1.6; }
    
    /* Margins */
    .sm\\:mb-1 { margin-bottom: 4px; }
    .sm\\:mb-2 { margin-bottom: 6px; }
    .sm\\:mb-3 { margin-bottom: 8px; }
    .sm\\:mb-4 { margin-bottom: 10px; }
    .sm\\:mb-6 { margin-bottom: 12px; }
    
    .md\\:mb-1 { margin-bottom: 6px; }
    .md\\:mb-2 { margin-bottom: 8px; }
    .md\\:mb-3 { margin-bottom: 12px; }
    .md\\:mb-4 { margin-bottom: 16px; }
    .md\\:mb-6 { margin-bottom: 20px; }
    
    .lg\\:mb-1 { margin-bottom: 8px; }
    .lg\\:mb-2 { margin-bottom: 12px; }
    .lg\\:mb-3 { margin-bottom: 16px; }
    .lg\\:mb-4 { margin-bottom: 20px; }
    .lg\\:mb-6 { margin-bottom: 24px; }
    
    /* Padding */
    .sm\\:p-1 { padding: 4px; }
    .sm\\:p-2 { padding: 6px; }
    .sm\\:p-3 { padding: 8px; }
    .sm\\:p-4 { padding: 10px; }
    
    .md\\:p-1 { padding: 6px; }
    .md\\:p-2 { padding: 8px; }
    .md\\:p-3 { padding: 12px; }
    .md\\:p-4 { padding: 16px; }
    
    .lg\\:p-1 { padding: 8px; }
    .lg\\:p-2 { padding: 12px; }
    .lg\\:p-3 { padding: 16px; }
    .lg\\:p-4 { padding: 20px; }
    
    /* Gaps for grid/flex layouts */
    .sm\\:gap-2 { gap: 6px; }
    .sm\\:gap-3 { gap: 8px; }
    .sm\\:gap-4 { gap: 10px; }
    
    .md\\:gap-2 { gap: 8px; }
    .md\\:gap-3 { gap: 12px; }
    .md\\:gap-4 { gap: 16px; }
    
    .lg\\:gap-2 { gap: 12px; }
    .lg\\:gap-3 { gap: 16px; }
    .lg\\:gap-4 { gap: 20px; }
  `
}

/**
 * Extract the current size variant from processed HTML
 */
export function detectCurrentVariant(htmlTemplate: string): SizeVariant {
  // Check for variant-specific classes to determine current variant
  if (htmlTemplate.includes('sm:')) return 'sm'
  if (htmlTemplate.includes('lg:')) return 'lg'
  return 'md' // default
}

/**
 * Convert size variant to style option ID
 */
export function variantToStyleId(variant: SizeVariant): string {
  const mapping = {
    sm: 'compact',
    md: 'standard', 
    lg: 'spacious'
  }
  return mapping[variant]
}

/**
 * Convert style option ID to size variant
 */
export function styleIdToVariant(styleId: string): SizeVariant {
  const mapping = {
    compact: 'sm',
    standard: 'md',
    spacious: 'lg'
  }
  return mapping[styleId as keyof typeof mapping] || 'md'
}