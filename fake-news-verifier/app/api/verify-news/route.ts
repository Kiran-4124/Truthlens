import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

interface FactCheckResponse {
  classification: 'True' | 'Fake' | 'Unverified';
  confidence: number;
  references: Array<{
    source: string;
    title: string;
    url: string;
    logo?: string;
  }>;
  analysis?: string;
}

interface GoogleFactCheckClaim {
  text?: string;
  claimReview?: Array<{
    url?: string;
    textualRating?: string;
  }>;
}

interface RSSItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
}

interface Reference {
  source: string;
  title: string;
  url: string;
  logo?: string;
}

const parser = new Parser();

// Helper function to validate URL
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// Helper function to sanitize input
function sanitizeInput(input: string): string {
  return input.trim().slice(0, 2000); // Limit to 2000 characters
}

// Google Fact Check API integration
async function checkGoogleFactCheck(query: string): Promise<GoogleFactCheckClaim[]> {
  try {
    const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
    if (!apiKey) {
      console.log('Google Fact Check API key not configured');
      return [];
    }

    const response = await fetch(
      `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&key=${apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.log('Google Fact Check API request failed:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.claims || [];
  } catch (error) {
    console.error('Error checking Google Fact Check:', error);
    return [];
  }
}

// PIB Fact Check RSS integration
async function checkPIBFactCheck(query: string): Promise<RSSItem[]> {
  try {
    const rssUrl = 'https://pib.gov.in/rss/pibfactcheck.xml';
    const feed = await parser.parseURL(rssUrl);
    
    const relevantItems = feed.items?.filter(item => 
      item.title?.toLowerCase().includes(query.toLowerCase()) ||
      item.contentSnippet?.toLowerCase().includes(query.toLowerCase())
    ) || [];

    return relevantItems.slice(0, 3); // Limit to 3 results
  } catch (error) { 
    console.error('Error checking PIB Fact Check:', error);
    return [];
  }
}

// AltNews RSS integration
async function checkAltNews(query: string): Promise<RSSItem[]> {
  try {
    const rssUrl = 'https://www.altnews.in/feed/';
    const feed = await parser.parseURL(rssUrl);
    
    const relevantItems = feed.items?.filter(item => 
      item.title?.toLowerCase().includes(query.toLowerCase()) ||
      item.contentSnippet?.toLowerCase().includes(query.toLowerCase())
    ) || [];

    return relevantItems.slice(0, 3); // Limit to 3 results
  } catch (error) {
    console.error('Error checking AltNews:', error);
    return [];
  }
}

// Groq API integration for LLM analysis
async function analyzeWithGroq(query: string, factCheckResults: Reference[]): Promise<string> {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return 'LLM analysis unavailable - API key not configured.';
    }

    const prompt = `Analyze this news claim for factual accuracy: "${query}"

Available fact-check information:
${factCheckResults.map(result => `- ${result.source}: ${result.title}`).join('\n')}

Provide a brief analysis (2-3 sentences) of the claim's plausibility based on the available information and general knowledge. Include any red flags or supporting evidence. End with a disclaimer that this is AI analysis and should not be the sole basis for fact-checking.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.log('Groq API request failed:', response.statusText);
      return 'LLM analysis unavailable at this time.';
    }

    const data = await response.json();
    console.log('Groq API response data:', data);
    return data.choices[0]?.message?.content || 'LLM analysis unavailable.';
  } catch (error) {
    console.error('Error with Groq analysis:', error);
    return 'LLM analysis unavailable due to technical issues.';
  }
}

// Main classification logic
function classifyNews(googleResults: GoogleFactCheckClaim[], pibResults: RSSItem[], altNewsResults: RSSItem[]): {
  classification: 'True' | 'Fake' | 'Unverified';
  confidence: number;
} {
  const totalResults = googleResults.length + pibResults.length + altNewsResults.length;
  
  if (totalResults === 0) {
    return { classification: 'Unverified', confidence: 0.5 };
  }

  // Analyze Google Fact Check results
  let trueCount = 0;
  let falseCount = 0;
  
  googleResults.forEach(claim => {
    const rating = claim.claimReview?.[0]?.textualRating?.toLowerCase() || '';
    if (rating.includes('true') || rating.includes('correct') || rating.includes('accurate')) {
      trueCount++;
    } else if (rating.includes('false') || rating.includes('fake') || rating.includes('incorrect')) {
      falseCount++;
    }
  });

  // Simple heuristic for classification
  if (falseCount > trueCount && falseCount > 0) {
    return { classification: 'Fake', confidence: Math.min(0.8, 0.6 + (falseCount / totalResults)) };
  } else if (trueCount > falseCount && trueCount > 0) {
    return { classification: 'True', confidence: Math.min(0.8, 0.6 + (trueCount / totalResults)) };
  } else {
    return { classification: 'Unverified', confidence: 0.5 + (totalResults * 0.1) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input. Please provide a news headline, article, or URL.' },
        { status: 400 }
      );
    }

    const sanitizedInput = sanitizeInput(input);
    
    // Extract the main content for analysis
    let queryText = sanitizedInput;
    
    // If it's a URL, extract the domain for now
    if (isValidUrl(sanitizedInput)) {
      const url = new URL(sanitizedInput);
      queryText = url.hostname + ' ' + url.pathname;
    }

    // Parallel fact-checking from multiple sources
    const [googleResults, pibResults, altNewsResults] = await Promise.all([
      checkGoogleFactCheck(queryText),
      checkPIBFactCheck(queryText),
      checkAltNews(queryText)
    ]);

    // Classify the news
    const { classification, confidence } = classifyNews(googleResults, pibResults, altNewsResults);

    // Compile references
    const references: Reference[] = [];

    // Add Google Fact Check references
    googleResults.forEach(claim => {
      if (claim.claimReview?.[0]) {
        const review = claim.claimReview[0];
        references.push({
          source: 'Google Fact Check',
          title: claim.text || 'Fact Check Result',
          url: review.url || '#',
        });
      }
    });

    // Add PIB references
    pibResults.forEach(item => {
      references.push({
        source: 'PIB Fact Check',
        title: item.title || 'PIB Fact Check',
        url: item.link || '#',
      });
    });

    // Add AltNews references
    altNewsResults.forEach(item => {
      references.push({
        source: 'AltNews',
        title: item.title || 'AltNews Article',
        url: item.link || '#',
      });
    });

    // Get LLM analysis if inconclusive
    let analysis = '';
    if (classification === 'Unverified' || confidence < 0.7) {
      analysis = await analyzeWithGroq(queryText, references);
    }

    const response: FactCheckResponse = {
      classification,
      confidence,
      references: references.slice(0, 5), // Limit to 5 references
      analysis: analysis || undefined,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in verify-news API:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}