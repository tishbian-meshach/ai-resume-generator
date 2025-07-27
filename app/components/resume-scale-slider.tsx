"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

interface ResumeScaleSliderProps {
  onScaleChange: (scale: number) => void
  className?: string
}

export function ResumeScaleSlider({ onScaleChange, className = "" }: ResumeScaleSliderProps) {
  const [scale, setScale] = useState([100]) // Array for Slider component
  
  const handleScaleChange = (newScale: number[]) => {
    setScale(newScale)
    onScaleChange(newScale[0] / 100) // Convert percentage to decimal
  }
  
  const resetScale = () => {
    setScale([100])
    onScaleChange(1)
  }
  
  const quickScale = (percentage: number) => {
    setScale([percentage])
    onScaleChange(percentage / 100)
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Resume Scale</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{scale[0]}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={resetScale}
                className="h-7 w-7 p-0"
                title="Reset to 100%"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={scale}
                onValueChange={handleScaleChange}
                max={150}
                min={50}
                step={5}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickScale(75)}
                className="text-xs"
              >
                75%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickScale(85)}
                className="text-xs"
              >
                85%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickScale(100)}
                className="text-xs"
              >
                100%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickScale(115)}
                className="text-xs"
              >
                115%
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Current scale:</span>
              <span className="font-medium">{scale[0]}%</span>
            </div>
            <div className="text-xs text-blue-600">
              💡 Scale down (75-85%) if content overflows A4 page
            </div>
            <div className="text-xs text-green-600">
              ✓ Scaling affects the entire resume proportionally
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}