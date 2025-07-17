"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Edit } from "lucide-react"

interface PersonalInfo {
  fullName: string
  email: string
  phone: string
  location: string
  linkedIn: string
  portfolio: string
  summary: string
  skills: string
  experience: string
  education: string
  certifications: string
}

interface ProfilePopupProps {
  personalInfo: PersonalInfo
  onPersonalInfoChange: (field: keyof PersonalInfo, value: string) => void
}

export function ProfilePopup({ personalInfo, onPersonalInfoChange }: ProfilePopupProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSave = () => {
    setIsEditing(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </span>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile Information</CardTitle>
                <CardDescription>Update your details to personalize your resume and cover letter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={personalInfo.fullName}
                      onChange={(e) => onPersonalInfoChange("fullName", e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => onPersonalInfoChange("email", e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={personalInfo.phone}
                      onChange={(e) => onPersonalInfoChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={personalInfo.location}
                      onChange={(e) => onPersonalInfoChange("location", e.target.value)}
                      placeholder="New York, NY"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedIn">LinkedIn</Label>
                    <Input
                      id="linkedIn"
                      value={personalInfo.linkedIn}
                      onChange={(e) => onPersonalInfoChange("linkedIn", e.target.value)}
                      placeholder="linkedin.com/in/johndoe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="portfolio">Portfolio/Website</Label>
                    <Input
                      id="portfolio"
                      value={personalInfo.portfolio}
                      onChange={(e) => onPersonalInfoChange("portfolio", e.target.value)}
                      placeholder="johndoe.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea
                    id="summary"
                    value={personalInfo.summary}
                    onChange={(e) => onPersonalInfoChange("summary", e.target.value)}
                    placeholder="Brief professional summary highlighting your key strengths..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="skills">Skills</Label>
                  <Textarea
                    id="skills"
                    value={personalInfo.skills}
                    onChange={(e) => onPersonalInfoChange("skills", e.target.value)}
                    placeholder="List your technical and soft skills, separated by commas..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="experience">Work Experience</Label>
                  <Textarea
                    id="experience"
                    value={personalInfo.experience}
                    onChange={(e) => onPersonalInfoChange("experience", e.target.value)}
                    placeholder="List your work experience with company names, positions, dates, and key achievements..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="education">Education</Label>
                  <Textarea
                    id="education"
                    value={personalInfo.education}
                    onChange={(e) => onPersonalInfoChange("education", e.target.value)}
                    placeholder="Your educational background, degrees, institutions, and dates..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="certifications">Certifications</Label>
                  <Textarea
                    id="certifications"
                    value={personalInfo.certifications}
                    onChange={(e) => onPersonalInfoChange("certifications", e.target.value)}
                    placeholder="Any relevant certifications, licenses, or additional qualifications..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your current profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                    <p className="text-sm">{personalInfo.fullName || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Email</Label>
                    <p className="text-sm">{personalInfo.email || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone</Label>
                    <p className="text-sm">{personalInfo.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Location</Label>
                    <p className="text-sm">{personalInfo.location || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">LinkedIn</Label>
                    <p className="text-sm">{personalInfo.linkedIn || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Portfolio</Label>
                    <p className="text-sm">{personalInfo.portfolio || "Not provided"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Professional Summary</Label>
                  <p className="text-sm mt-1">{personalInfo.summary || "Not provided"}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Skills</Label>
                  <p className="text-sm mt-1">{personalInfo.skills || "Not provided"}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Work Experience</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{personalInfo.experience || "Not provided"}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Education</Label>
                  <p className="text-sm mt-1">{personalInfo.education || "Not provided"}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Certifications</Label>
                  <p className="text-sm mt-1">{personalInfo.certifications || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}