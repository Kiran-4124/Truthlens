# Fake News & Deepfake Verifier

A Next.js 14 application that helps verify news articles and detect deepfakes using AI-powered analysis and multiple fact-checking sources.

## Features

### 🔍 Fake News Verification
- **Multi-source fact-checking**: Google Fact Check API, PIB RSS, AltNews RSS
- **AI-powered analysis**: Groq LLM integration for inconclusive cases
- **Real-time verification**: Instant results with confidence scores
- **Source references**: Clickable links to fact-checking sources

### 🎭 Deepfake Detection
- **Image analysis**: Upload JPG, PNG images for manipulation detection
- **Video analysis**: Support for MP4, MOV, AVI video files
- **AI models**: HuggingFace integration with specialized deepfake detection models
- **Technical metadata**: Detailed analysis of file properties

### 🎨 User Interface
- **Responsive design**: Works on desktop and mobile devices
- **Traffic light system**: Clear visual indicators (Green/Yellow/Red)
- **Dark mode support**: Automatic theme switching
- **Accessible**: Built with accessibility best practices

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **API Integration**: 
  - Google Fact Check API
  - Groq API (LLM)
  - HuggingFace Inference API
- **Image Processing**: Sharp
- **RSS Parsing**: RSS Parser
- **Deployment**: Vercel / Docker

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for external services

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fake-news-verifier
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your API keys in `.env.local`:
   ```env
   GOOGLE_FACT_CHECK_API_KEY=your_google_api_key
   GROQ_API_KEY=your_groq_api_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Keys Setup

### Google Fact Check API
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable the Fact Check Tools API
4. Create credentials (API Key)
5. Copy the API key to your `.env.local`

### Groq API
1. Visit [Groq](https://groq.com/)
2. Sign up for an account
3. Generate an API key
4. Copy the API key to your `.env.local`

### HuggingFace API
1. Go to [HuggingFace](https://huggingface.co/settings/tokens)
2. Create an account and login
3. Generate a new token
4. Copy the token to your `.env.local`

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to [Vercel](https://vercel.com)
   - Add environment variables in Vercel dashboard
   - Deploy automatically

### Docker

1. **Build the image**
   ```bash
   docker build -t fake-news-verifier .
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

## Project Structure

```
fake-news-verifier/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── verify-news/          # News verification endpoint
│   │   └── verify-media/         # Media verification endpoint
│   ├── verify-news/              # News verification page
│   ├── verify-media/             # Media verification page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── public/                       # Static assets
├── tmp/                          # Temporary file storage
├── .env.example                  # Environment variables template
├── Dockerfile                    # Docker configuration
├── docker-compose.yml            # Docker Compose setup
├── vercel.json                   # Vercel deployment config
└── SECURITY.md                   # Security documentation
```

## Usage

### Verifying News Articles

1. Go to the homepage
2. Click "Check News Article"
3. Enter a news headline, article text, or URL
4. Click "Verify News"
5. Review the results with confidence scores and source references

### Detecting Deepfakes

1. Go to the homepage
2. Click "Analyze Media"
3. Upload an image or video file (max 50MB)
4. Click "Analyze Media"
5. Review the manipulation probability and technical analysis

## Security Features

- Input validation and sanitization
- File type and size restrictions
- Secure file handling with automatic cleanup
- No execution of uploaded files
- Environment variable protection
- CORS configuration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Limitations & Disclaimers

⚠️ **Important**: This tool aids verification but cannot guarantee 100% accuracy. Always cross-reference with multiple sources for critical information.

- AI models may have biases or limitations
- Fact-checking sources may not cover all topics
- New manipulation techniques may not be detected
- Results should be used as guidance, not definitive proof

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Disclaimer**: This tool is designed to assist in verification efforts but should not be the sole basis for determining the authenticity of news or media content. Always verify through multiple sources and expert analysis.
