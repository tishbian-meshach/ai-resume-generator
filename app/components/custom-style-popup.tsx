"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Palette, Loader2, Sparkles } from "lucide-react"

interface CustomStylePopupProps {
  onGenerateCustomStyle: (styleInstructions: string, isSurpriseMe?: boolean) => Promise<boolean>
  isGeneratingCustomStyle: boolean
}

export function CustomStylePopup({ onGenerateCustomStyle, isGeneratingCustomStyle }: CustomStylePopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customStyleInstructions, setCustomStyleInstructions] = useState("")

  const handleApply = async () => {
    if (!customStyleInstructions.trim()) {
      return
    }
    
    const success = await onGenerateCustomStyle(customStyleInstructions, false)
    if (success) {
      setIsOpen(false)
    }
  }

  const handleSurpriseMe = async () => {
    const success = await onGenerateCustomStyle("", true)
    if (success) {
      setIsOpen(false)
    }
  }

  const setPresetStyle = (style: string) => {
    setCustomStyleInstructions(style)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Custom Style
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Customize Resume Style
          </DialogTitle>
          <DialogDescription>
            Describe how you want your resume to look, or let AI surprise you with a creative design.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Style Presets */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Style Presets:</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetStyle("Clean single-column design with navy blue headers, modern sans-serif font, subtle section dividers, professional ATS-friendly layout")}
                className="text-xs"
              >
                Professional Blue
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetStyle("Minimalist single-column style with gray accents, organized sections, clean typography, plenty of white space, modern professional look")}
                className="text-xs"
              >
                Minimalist Gray
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetStyle("Modern single-column design with teal color scheme, bold section headers, clean typography, organized layout with good spacing")}
                className="text-xs"
              >
                Modern Teal
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetStyle("Classic single-column layout with black headers, Times New Roman font, traditional professional styling, clean borders")}
                className="text-xs"
              >
                Classic Black
              </Button>
            </div>
          </div>

          {/* Custom Style Instructions */}
          <div>
            <Label htmlFor="customStyle" className="text-sm font-medium">
              Describe your desired style:
            </Label>
            <Textarea
              id="customStyle"
              value={customStyleInstructions}
              onChange={(e) => setCustomStyleInstructions(e.target.value)}
              placeholder="Example: Modern single-column design with blue accent colors, clean typography, professional look with subtle borders, use Calibri font, organized sections with good spacing..."
              rows={4}
              className="w-full mt-2"
            />
          </div>

          {/* Tips and Examples */}
          <div className="text-xs text-gray-500 space-y-2">
            <div className="bg-gray-100 p-3 rounded text-xs">
              <p className="font-medium mb-2">💡 Tips for better results:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Single-column layouts</strong> work best for most resumes (no white space issues)</li>
                <li><strong>Avoid multi-column</strong> unless you specifically need it (can create unbalanced layouts)</li>
                <li>Specify <strong>colors, fonts, and spacing</strong> preferences</li>
                <li>Mention <strong>"professional"</strong> and <strong>"ATS-friendly"</strong> for best results</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-3 rounded text-xs">
              <p className="font-medium mb-2">📝 Example prompts:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>"Clean single-column design with navy blue headers, modern sans-serif font, subtle section dividers"</li>
                <li>"Minimalist professional style with gray accents, organized sections, plenty of white space"</li>
                <li>"Modern design with teal color scheme, bold section headers, clean typography, single column layout"</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSurpriseMe}
              disabled={isGeneratingCustomStyle}
              variant="secondary"
              className="flex items-center gap-2 flex-1"
            >
              {isGeneratingCustomStyle ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Surprise Me!
                </>
              )}
            </Button>
            <Button
              onClick={handleApply}
              disabled={isGeneratingCustomStyle || !customStyleInstructions.trim()}
              className="flex items-center gap-2 flex-1"
            >
              {isGeneratingCustomStyle ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Palette className="h-4 w-4" />
                  Apply Style
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}