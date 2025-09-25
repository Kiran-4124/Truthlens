import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

interface MediaVerificationResult {
  classification: 'Likely Genuine' | 'Suspicious' | 'Likely Fake';
  confidence: number;
  manipulationScore: number;
  analysis: {
    faceAnalysis?: string;
    videoAnalysis?: string;
    technicalDetails?: string;
  };
  metadata?: {
    fileSize: number;
    dimensions?: string;
    duration?: number;
  };
}

// Helper function to sanitize filename
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

// Helper function to get file extension
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Helper function to validate file type
function isValidFileType(filename: string): boolean {
  const validExtensions = ['jpg', 'jpeg', 'png', 'mp4', 'mov', 'avi'];
  const extension = getFileExtension(filename);
  return validExtensions.includes(extension);
}

// HuggingFace API integration for deepfake detection
async function analyzeWithHuggingFace(buffer: Buffer, isImage: boolean): Promise<{
  manipulationScore: number;
  confidence: number;
  analysis: string;
}> {
  try {
    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    if (!hfApiKey) {
      return {
        manipulationScore: 0.5,
        confidence: 0.3,
        analysis: 'HuggingFace API key not configured. Unable to perform AI analysis.',
      };
    }

    // Use different models for images vs videos
    const modelEndpoint = isImage 
      ? 'https://api-inference.huggingface.co/models/dima806/deepfake_vs_real_image_detection'
      : 'https://api-inference.huggingface.co/models/selimsef/dfdc_deepfake_challenge';

    const response = await fetch(modelEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfApiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer as BodyInit,
    });

    if (!response.ok) {
      console.log('HuggingFace API request failed:', response.statusText);
      return {
        manipulationScore: 0.5,
        confidence: 0.3,
        analysis: 'HuggingFace API unavailable. Analysis could not be completed.',
      };
    }

    const result = await response.json();
    
    // Parse the result based on the model response format
    let manipulationScore = 0.5;
    let confidence = 0.5;
    let analysis = 'Analysis completed using AI models.';

    if (Array.isArray(result) && result.length > 0) {
      // Handle classification model response
      const fakeResult = result.find(r => r.label?.toLowerCase().includes('fake'));
      const realResult = result.find(r => r.label?.toLowerCase().includes('real'));
      
      if (fakeResult) {
        manipulationScore = fakeResult.score || 0.5;
        confidence = Math.abs(fakeResult.score - 0.5) * 2; // Convert to confidence
      } else if (realResult) {
        manipulationScore = 1 - (realResult.score || 0.5);
        confidence = Math.abs(realResult.score - 0.5) * 2;
      }
      
      analysis = `AI model analysis: ${manipulationScore > 0.7 ? 'High' : manipulationScore > 0.4 ? 'Medium' : 'Low'} likelihood of manipulation detected.`;
    }

    return { manipulationScore, confidence, analysis };

  } catch (error) {
    console.error('Error with HuggingFace analysis:', error);
    return {
      manipulationScore: 0.5,
      confidence: 0.3,
      analysis: 'AI analysis failed due to technical issues. Manual verification recommended.',
    };
  }
}

// Analyze image metadata for manipulation signs
async function analyzeImageMetadata(buffer: Buffer): Promise<{
  dimensions: string;
  technicalDetails: string;
}> {
  try {
    const metadata = await sharp(buffer).metadata();
    
    const dimensions = `${metadata.width}×${metadata.height}`;
    
    let technicalDetails = `Format: ${metadata.format?.toUpperCase()}, `;
    technicalDetails += `Channels: ${metadata.channels}, `;
    technicalDetails += `Density: ${metadata.density || 'Unknown'} DPI`;
    
    // Check for suspicious metadata patterns
    if (!metadata.exif) {
      technicalDetails += '. Warning: No EXIF data found (may indicate processing).';
    }
    
    return { dimensions, technicalDetails };
  } catch (error) {
    console.error('Error analyzing image metadata:', error);
    return {
      dimensions: 'Unknown',
      technicalDetails: 'Metadata analysis failed.',
    };
  }
}

// Classify media based on manipulation score
function classifyMedia(manipulationScore: number, confidence: number): {
  classification: 'Likely Genuine' | 'Suspicious' | 'Likely Fake';
  finalConfidence: number;
} {
  let classification: 'Likely Genuine' | 'Suspicious' | 'Likely Fake';
  
  if (manipulationScore < 0.3) {
    classification = 'Likely Genuine';
  } else if (manipulationScore < 0.7) {
    classification = 'Suspicious';
  } else {
    classification = 'Likely Fake';
  }
  
  // Adjust confidence based on how certain we are
  const finalConfidence = Math.min(0.9, confidence * 0.8 + 0.2);
  
  return { classification, finalConfidence };
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const data = await request.formData();
    const file = data.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Please select an image or video file.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidFileType(file.name)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPG, PNG, MP4, MOV, or AVI files only.' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Please upload files smaller than 50MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine if it's an image or video
    const extension = getFileExtension(file.name);
    const isImage = ['jpg', 'jpeg', 'png'].includes(extension);
    const isVideo = ['mp4', 'mov', 'avi'].includes(extension);

    // Save temporary file for processing
    const sanitizedFilename = sanitizeFilename(file.name);
    tempFilePath = join(process.cwd(), 'tmp', `${Date.now()}_${sanitizedFilename}`);
    
    try {
      await writeFile(tempFilePath, buffer);
    } catch (writeError) {
      console.error('Error writing temporary file:', writeError);
      // Continue without temp file for in-memory processing
      tempFilePath = null;
    }

    // Perform AI analysis
    const { manipulationScore, confidence, analysis } = await analyzeWithHuggingFace(buffer, isImage);

    // Get classification
    const { classification, finalConfidence } = classifyMedia(manipulationScore, confidence);

    // Analyze metadata for images
    const metadata: {
      fileSize: number;
      dimensions?: string;
      duration?: number;
    } = {
      fileSize: file.size,
    };

    const analysisDetails: {
      faceAnalysis?: string;
      videoAnalysis?: string;
      technicalDetails?: string;
    } = {};

    if (isImage) {
      const { dimensions, technicalDetails } = await analyzeImageMetadata(buffer);
      metadata.dimensions = dimensions;
      analysisDetails.faceAnalysis = analysis;
      analysisDetails.technicalDetails = technicalDetails;
    } else if (isVideo) {
      analysisDetails.videoAnalysis = analysis;
      analysisDetails.technicalDetails = `Video file analysis completed. Format: ${extension.toUpperCase()}`;
      
      // For videos, we'd typically extract frames and analyze them
      // This is a simplified implementation
      metadata.duration = Math.round(file.size / (1024 * 1024 * 2)); // Rough estimate
    }

    const result: MediaVerificationResult = {
      classification,
      confidence: finalConfidence,
      manipulationScore,
      analysis: analysisDetails,
      metadata,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in verify-media API:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}