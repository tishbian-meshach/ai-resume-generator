/**
 * Test file for responsive utilities - can be run in browser console
 */

import { processResponsiveTemplate, styleIdToVariant, variantToStyleId, getSizeVariantConfig } from './responsive-utils'

// Test HTML template with responsive classes
const testTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .sm\\:text-xs { font-size: 10px; }
    .md\\:text-sm { font-size: 12px; }
    .lg\\:text-base { font-size: 14px; }
    .sm\\:mb-2 { margin-bottom: 6px; }
    .md\\:mb-3 { margin-bottom: 12px; }
    .lg\\:mb-4 { margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1 class="sm:text-xs md:text-sm lg:text-base sm:mb-2 md:mb-3 lg:mb-4">Test Header</h1>
  <p class="sm:text-xs md:text-sm lg:text-base">Test paragraph</p>
</body>
</html>
`

// Test functions
export function testResponsiveUtils() {
  console.log('Testing Responsive Utils...')
  
  // Test variant conversions
  console.log('Style ID to Variant:')
  console.log('compact ->', styleIdToVariant('compact')) // should be 'sm'
  console.log('standard ->', styleIdToVariant('standard')) // should be 'md'
  console.log('spacious ->', styleIdToVariant('spacious')) // should be 'lg'
  
  console.log('\nVariant to Style ID:')
  console.log('sm ->', variantToStyleId('sm')) // should be 'compact'
  console.log('md ->', variantToStyleId('md')) // should be 'standard'
  console.log('lg ->', variantToStyleId('lg')) // should be 'spacious'
  
  // Test config retrieval
  console.log('\nSize Variant Configs:')
  console.log('sm config:', getSizeVariantConfig('sm'))
  console.log('md config:', getSizeVariantConfig('md'))
  console.log('lg config:', getSizeVariantConfig('lg'))
  
  // Test template processing
  console.log('\nTemplate Processing:')
  
  const smResult = processResponsiveTemplate(testTemplate, 'sm')
  console.log('SM processed (should only have sm classes):', smResult.includes('text-xs') && !smResult.includes('md:') && !smResult.includes('lg:'))
  
  const mdResult = processResponsiveTemplate(testTemplate, 'md')
  console.log('MD processed (should only have md classes):', mdResult.includes('text-sm') && !mdResult.includes('sm:') && !mdResult.includes('lg:'))
  
  const lgResult = processResponsiveTemplate(testTemplate, 'lg')
  console.log('LG processed (should only have lg classes):', lgResult.includes('text-base') && !lgResult.includes('sm:') && !lgResult.includes('md:'))
  
  console.log('All tests completed!')
  
  return {
    smResult,
    mdResult,
    lgResult
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testResponsiveUtils = testResponsiveUtils
}