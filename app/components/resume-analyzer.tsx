"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Wrench, CheckCircle, AlertCircle, Target, TrendingUp, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

interface KeywordAnalysis {
  matchedKeywords: string[]
  missingKeywords: string[]
  keywordScore: number
}

interface ATSAnalysis {
  atsScore: number
  keywordAnalysis: KeywordAnalysis
  improvementSuggestions: string[]
  strengthsFound: string[]
  weaknesses: string[]
}

interface ResumeAnalyzerProps {
  resume: string
  jobDescription: string
  selectedModel: string
  onResumeUpdated: (fixedResume: string) => void
}

export function ResumeAnalyzer({ resume, jobDescription, selectedModel, onResumeUpdated }: ResumeAnalyzerProps) {
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)
  const { toast } = useToast()

  const analyzeResume = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume,
          jobDescription,
          selectedModel,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze resume")
      }

      const data = await response.json()
      setAnalysis(data.analysis)
      setUsedFallback(data.usedFallback)

      // Show toast based on fallback usage
      if (data.usedFallback) {
        toast({
          title: "Analysis Complete! (Using OpenRouter Fallback)",
          description: "Google's API was overloaded, so we used OpenRouter to analyze your resume successfully",
        })
      } else {
        toast({
          title: "Analysis Complete!",
          description: "Your resume has been analyzed successfully",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const fixResume = async () => {
    if (!analysis) return

    setIsFixing(true)
    try {
      const response = await fetch("/api/fix-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume,
          jobDescription,
          analysisReport: JSON.stringify(analysis),
          selectedModel,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fix resume")
      }

      const data = await response.json()
      onResumeUpdated(data.fixedResume)
      
      // Show toast based on fallback usage
      if (data.usedFallback) {
        toast({
          title: "Resume Fixed! (Using OpenRouter Fallback)",
          description: "Google's API was overloaded, so we used OpenRouter to fix your resume successfully",
        })
      } else {
        toast({
          title: "Resume Fixed!",
          description: "Your resume has been improved based on the analysis",
        })
      }
      
      // Reset analysis to trigger re-analysis of fixed resume
      setAnalysis(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fix resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsFixing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreDescription = (score: number) => {
    if (score >= 90) return "Excellent"
    if (score >= 80) return "Good"
    if (score >= 70) return "Fair"
    if (score >= 60) return "Needs Improvement"
    return "Poor"
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Resume Analyzer
        </CardTitle>
        <CardDescription>
          Analyze your resume against the job description for ATS optimization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!analysis ? (
          <div className="text-center">
            <Button onClick={analyzeResume} disabled={isAnalyzing} size="lg">
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analyze Resume
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ATS Score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  ATS Score
                </h3>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.atsScore)}`}>
                    {analysis.atsScore}/100
                  </div>
                  <div className="text-sm text-gray-600">
                    {getScoreDescription(analysis.atsScore)}
                  </div>
                </div>
              </div>
              <Progress value={analysis.atsScore} className="h-3" />
            </div>

            {/* Keyword Analysis */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Keyword Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Matched Keywords ({analysis.keywordAnalysis.matchedKeywords.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordAnalysis.matchedKeywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Missing Keywords ({analysis.keywordAnalysis.missingKeywords.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordAnalysis.missingKeywords.map((keyword, index) => (
                      <Badge key={index} variant="destructive" className="bg-red-100 text-red-800">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Keyword Match Score</span>
                  <span className={`text-sm font-bold ${getScoreColor(analysis.keywordAnalysis.keywordScore)}`}>
                    {analysis.keywordAnalysis.keywordScore}%
                  </span>
                </div>
                <Progress value={analysis.keywordAnalysis.keywordScore} className="h-2" />
              </div>
            </div>

            {/* Strengths */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Strengths
              </h3>
              <div className="space-y-2">
                {analysis.strengthsFound.map((strength, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Areas for Improvement
              </h3>
              <div className="space-y-2">
                {analysis.weaknesses.map((weakness, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{weakness}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvement Suggestions */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Improvement Suggestions
              </h3>
              <div className="space-y-2">
                {analysis.improvementSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fix Resume Button */}
            <div className="pt-4 border-t">
              <Button onClick={fixResume} disabled={isFixing} size="lg" className="w-full">
                {isFixing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing Resume...
                  </>
                ) : (
                  <>
                    <Wrench className="mr-2 h-4 w-4" />
                    Fix Resume Based on Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}