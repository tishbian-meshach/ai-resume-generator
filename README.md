# 🚀 AI Resume & Cover Letter Generator

A comprehensive AI-powered application that generates customized resumes and cover letters, analyzes ATS compatibility, and provides intelligent resume optimization suggestions.

## ✨ Features

### 🎯 **Core Features**
- **AI-Powered Resume Generation** - Creates tailored resumes based on personal information and job descriptions
- **Cover Letter Generation** - Generates personalized cover letter paragraphs
- **ATS Resume Analysis** - Comprehensive analysis with detailed scoring (0-100)
- **Smart Resume Optimization** - Automatically fixes resumes based on analysis reports
- **Multiple AI Models** - Choose between Gemini 2.5 Pro and Gemini 2.0 Flash

### 🔧 **Advanced Features**
- **Fallback System** - Automatic OpenRouter fallback when Google's API is overloaded
- **Keyword Analysis** - Identifies matched and missing keywords from job descriptions
- **Real-time Scoring** - Visual progress bars and color-coded scoring
- **Toast Notifications** - User-friendly feedback with fallback indicators
- **Responsive Design** - Works seamlessly on desktop and mobile devices

### 📊 **Resume Analysis Features**
- **ATS Score (0-100)** - Comprehensive scoring based on multiple criteria
- **Keyword Analysis** - Matched vs missing keywords with visual badges
- **Improvement Suggestions** - Actionable recommendations for optimization
- **Strengths & Weaknesses** - Detailed analysis of resume quality
- **One-Click Fix** - Automatically improve resume based on analysis

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui Components
- **AI Integration**: Google Gemini API, OpenRouter API
- **Icons**: Lucide React
- **UI Components**: Radix UI
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Google Generative AI API key
- OpenRouter API key (for fallback)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/resume-cover-letter-generator.git
   cd resume-cover-letter-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎮 How to Use

### 1. **Personal Information**
- Fill in your personal details (name, email, phone, location, etc.)
- Add your professional summary, skills, experience, and education
- Review your profile using the profile popup

### 2. **Job Description**
- Paste the job description you're applying for
- Select your preferred AI model (Gemini 2.5 Pro or 2.0 Flash)
- Click "Generate Resume & Cover Letter Paragraph"

### 3. **Resume Analysis**
- After generation, click "Analyze Resume" to get ATS scoring
- Review the detailed analysis including:
  - ATS Score (0-100)
  - Keyword analysis with matched/missing keywords
  - Strengths and areas for improvement
  - Specific suggestions for optimization

### 4. **Resume Optimization**
- Click "Fix Resume Based on Analysis" to automatically improve your resume
- The system will integrate missing keywords and address weaknesses
- Get an updated, optimized resume ready for ATS systems

## 🔌 API Endpoints

### Resume Generation
```
POST /api/generate-content
```
**Body:**
```json
{
  "personalInfo": { /* personal information object */ },
  "jobDescription": "string",
  "selectedModel": "gemini-2.5-pro" | "gemini-2.0-flash"
}
```

### Resume Analysis
```
POST /api/analyze-resume
```
**Body:**
```json
{
  "resume": "string",
  "jobDescription": "string",
  "selectedModel": "gemini-2.5-pro" | "gemini-2.0-flash"
}
```

### Resume Fix
```
POST /api/fix-resume
```
**Body:**
```json
{
  "resume": "string",
  "jobDescription": "string",
  "analysisReport": "string",
  "selectedModel": "gemini-2.5-pro" | "gemini-2.0-flash"
}
```

## 🎨 AI Models

### **Gemini 2.5 Pro**
- Latest and most capable model
- Best for complex analysis and detailed content generation
- Higher quality output with better reasoning

### **Gemini 2.0 Flash**
- Fast and efficient model
- Good for quick generation and analysis
- Optimized for speed while maintaining quality

### **OpenRouter Fallback**
- Automatic fallback when Google's API is overloaded (503 errors)
- Uses `google/gemini-2.0-flash-exp:free` model
- Seamless transition with user notifications

## 🔧 Configuration

### Environment Variables
```env
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional (defaults provided)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### API Rate Limits
- Google Gemini: Depends on your API quota
- OpenRouter: Free tier with rate limits
- Automatic fallback system handles quota exceeded scenarios

## 🚨 Error Handling

The application includes comprehensive error handling:

### **Fallback System**
- Automatic OpenRouter fallback on 503, 429, 502 errors
- Network error detection and recovery
- User-friendly toast notifications

### **JSON Parsing**
- Robust JSON parsing with auto-repair functionality
- Handles incomplete responses and truncated JSON
- Fallback data extraction for critical information

### **User Feedback**
- Toast notifications for all operations
- Loading states with progress indicators
- Clear error messages with actionable suggestions

## 📊 ATS Scoring Criteria

The ATS analysis scores resumes based on:

- **Keywords Matching (40%)** - Alignment with job description keywords
- **Format Compatibility (20%)** - ATS-friendly formatting
- **Section Organization (15%)** - Proper structure and sections
- **Relevant Experience (15%)** - Experience relevance to the role
- **Education Alignment (10%)** - Education requirements matching

## 🎯 Resume Optimization

The fix system addresses:

- **Missing Keywords** - Integrates important keywords naturally
- **Weak Sections** - Strengthens underperforming areas
- **ATS Compatibility** - Improves formatting for ATS systems
- **Content Enhancement** - Adds quantifiable achievements
- **Keyword Density** - Optimizes without keyword stuffing

## 🚀 Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Custom Deployment
1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Set up environment variables on your hosting platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini API for powerful AI capabilities
- OpenRouter for reliable fallback services
- shadcn/ui for beautiful UI components
- Vercel for seamless deployment
- The open-source community for amazing tools and libraries

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/resume-cover-letter-generator/issues) section
2. Create a new issue with detailed information
3. Contact the maintainers

---

**Made with ❤️ for job seekers everywhere**

> Transform your job application process with AI-powered resume optimization and ATS-friendly formatting.