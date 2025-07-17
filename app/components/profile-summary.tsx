import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Briefcase, GraduationCap, Award, Globe, Github, Linkedin } from "lucide-react"

export function ProfileSummary() {
  const aiSkills = [
    "Prompt Engineering",
    "ChatGPT",
    "Claude",
    "Gemini AI",
    "Midjourney",
    "DALL-E",
    "Stable Diffusion",
    "AI Workflow Automation",
  ]

  const designSkills = [
    "UI/UX Design",
    "Figma",
    "Adobe Creative Suite",
    "Prototyping",
    "User Research",
    "Wireframing",
    "Adobe XD",
  ]

  const techSkills = ["React", "JavaScript", "HTML5", "CSS3", "Tailwind CSS"]

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Overview
        </CardTitle>
        <CardDescription>AI-Enhanced Designer & Computer Science Student</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Current Role
            </h4>
            <p className="text-sm text-gray-600">Leading Designer at TripXplo</p>
            <p className="text-sm text-gray-600">AI-Enhanced Freelance Designer (4+ years)</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Education
            </h4>
            <p className="text-sm text-gray-600">B.E Computer Science (2022-2026)</p>
            <p className="text-sm text-gray-600">University College of Engineering, Kanchipuram</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="font-semibold mb-2">AI & Automation Skills</h4>
            <div className="flex flex-wrap gap-1">
              {aiSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Design Skills</h4>
            <div className="flex flex-wrap gap-1">
              {designSkills.map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Technical Skills</h4>
            <div className="flex flex-wrap gap-1">
              {techSkills.map((skill) => (
                <Badge key={skill} variant="default" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <a
            href="https://tishbian.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Globe className="h-4 w-4" />
            Portfolio
          </a>
          <a
            href="https://linkedin.com/in/tishbian-meshach"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </a>
          <a
            href="https://github.com/tishbian-meshach"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Key Achievements
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Enhanced productivity by 60% through AI-powered design workflows</li>
            <li>• Completed 100+ design projects with 40% faster turnaround using AI</li>
            <li>• Reduced design iteration time by 50% using AI-powered prototyping</li>
            <li>• Leading design team while pursuing Computer Science degree</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
