'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

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

export default function VerifyMediaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MediaVerificationResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'video/mov', 'video/avi'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please select a valid image (JPG, PNG) or video (MP4, MOV, AVI) file.');
      return;
    }

    // Validate file size (50MB limit)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setResult(null);

    // Create preview
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      // For videos, we'll just show the file name
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/verify-media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to verify media');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to verify media. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrafficLightColor = (classification: string) => {
    switch (classification) {
      case 'Likely Genuine':
        return 'bg-green-500';
      case 'Likely Fake':
        return 'bg-red-500';
      case 'Suspicious':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center text-purple-600 hover:text-purple-800 dark:text-purple-400"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m0 7h18" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Deepfake Detector
            </h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Upload Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Upload Image or Video
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
              />
              
              {!file ? (
                <div>
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Drop your file here or click to browse
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Supports: JPG, PNG, MP4, MOV, AVI (Max 50MB)
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    Choose File
                  </button>
                </div>
              ) : (
                <div>
                  {preview ? (
                    <div className="mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="max-h-64 mx-auto rounded-lg shadow-lg"
                      />
                    </div>
                  ) : (
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-purple-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <p className="text-gray-900 dark:text-white font-medium">{file.name}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {formatFileSize(file.size)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="mt-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 text-sm"
                    disabled={isLoading}
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !file}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Analyze Media'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-8">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Analysis Results
            </h3>

            {/* Traffic Light Indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <div className={`w-24 h-24 rounded-full ${getTrafficLightColor(result.classification)} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    {result.classification === 'Likely Genuine' && (
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                    {result.classification === 'Likely Fake' && (
                      <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                    {result.classification === 'Suspicious' && (
                      <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                  {result.classification}
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Manipulation Score: {Math.round(result.manipulationScore * 100)}%
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Confidence: {Math.round(result.confidence * 100)}%
                </p>
              </div>
            </div>

            {/* Analysis Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {result.analysis.faceAnalysis && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Face Analysis:</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {result.analysis.faceAnalysis}
                  </p>
                </div>
              )}
              
              {result.analysis.videoAnalysis && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Video Analysis:</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {result.analysis.videoAnalysis}
                  </p>
                </div>
              )}
              
              {result.analysis.technicalDetails && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg md:col-span-2">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Technical Details:</h5>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {result.analysis.technicalDetails}
                  </p>
                </div>
              )}
            </div>

            {/* File Metadata */}
            {result.metadata && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">File Information:</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Size:</span>
                    <p className="text-gray-900 dark:text-white">{formatFileSize(result.metadata.fileSize)}</p>
                  </div>
                  {result.metadata.dimensions && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Dimensions:</span>
                      <p className="text-gray-900 dark:text-white">{result.metadata.dimensions}</p>
                    </div>
                  )}
                  {result.metadata.duration && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <p className="text-gray-900 dark:text-white">{result.metadata.duration}s</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Disclaimer:</strong> This tool aids verification but cannot guarantee 100% accuracy. 
              Always cross-reference with multiple sources for critical information.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}