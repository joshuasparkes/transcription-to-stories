'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faFileAlt, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { parseVTT } from '@/lib/vttParser';
import { UserStory } from '@/lib/types';
import ResultsTable from '@/components/ResultsTable';

interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserStory[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update page title to show loading indicator
  useEffect(() => {
    const originalTitle = document.title;
    if (loading) {
      document.title = '⏳ Processing...';
    } else {
      document.title = originalTitle;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [loading]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (textInput.trim()) {
      setError('Please use either file upload or text input, not both.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!file.name.endsWith('.vtt')) {
      setError('Please upload a .vtt file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploadedFile(file);
    setError('');
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (uploadedFile) {
      setError('Please use either file upload or text input, not both.');
      return;
    }
    setTextInput(e.target.value);
    setError('');
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError('');
  };

  const handleClearText = () => {
    setTextInput('');
    setError('');
  };

  const handleSubmit = async () => {
    console.log('🚀 [Frontend] Submit button clicked');
    setError('');
    setResults([]);
    setUsage(null);

    let transcriptText = '';

    if (uploadedFile) {
      console.log('📁 [Frontend] Processing uploaded file:', uploadedFile.name);
      try {
        const fileContent = await uploadedFile.text();
        console.log('📄 [Frontend] File content loaded, length:', fileContent.length);
        transcriptText = parseVTT(fileContent);
        console.log('✅ [Frontend] VTT parsed, cleaned text length:', transcriptText.length);
      } catch (err) {
        console.error('❌ [Frontend] Failed to read file:', err);
        setError('Failed to read file');
        return;
      }
    } else if (textInput.trim()) {
      console.log('📝 [Frontend] Using text input, length:', textInput.length);
      transcriptText = textInput.trim();
    } else {
      console.warn('⚠️  [Frontend] No input provided');
      setError('Please provide a transcript file or text');
      return;
    }

    setLoading(true);
    console.log('📤 [Frontend] Sending transcript to API...');

    try {
      const response = await fetch('/api/extract-requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: transcriptText }),
      });

      console.log('📥 [Frontend] API response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to extract requirements');
      }

      const data = await response.json();
      console.log('📊 [Frontend] Response data:', data);
      console.log('📋 [Frontend] User stories count:', data.userStories?.length || 0);

      setResults(data.userStories || []);
      setUsage(data.usage || null);

      console.log('✅ [Frontend] Results and usage set successfully');
    } catch (err) {
      console.error('❌ [Frontend] Error processing transcript:', err);
      setError('Failed to process transcript. Please try again.');
    } finally {
      setLoading(false);
      console.log('🏁 [Frontend] Processing complete');
    }
  };

  return (
    <div className="min-h-screen text-black bg-black px-8 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex-1" />
          <h1 className="font-[family-name:var(--font-raleway)] font-bold text-4xl text-white text-center flex-1">
            Transcription to User Story Tool
          </h1>
          <div className="flex-1 flex justify-end">
          </div>
        </div>

        {/* Main Form */}
        <div className="space-y-6">
          {/* File Upload */}
          <div className="relative">
            <label
              htmlFor="file-upload"
              className="block w-full p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-200 focus-within:border-blue-500 focus-within:shadow-lg"
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <FontAwesomeIcon icon={faUpload} className="text-3xl text-gray-500" />
                <span className="text-gray-700 font-medium">
                  {uploadedFile ? uploadedFile.name : 'Upload .vtt file or drag and drop'}
                </span>
                <span className="text-sm text-gray-500">Click to browse files</span>
              </div>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".vtt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {uploadedFile && (
              <button
                onClick={handleRemoveFile}
                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>

          {/* Text Input */}
          <div className="relative">
            <textarea
              value={textInput}
              onChange={handleTextChange}
              placeholder="Or paste your transcript here..."
              className="w-full h-64 p-4 bg-white rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none focus:shadow-lg transition-all duration-200 resize-none"
            />
            {textInput && (
              <button
                onClick={handleClearText}
                className="absolute top-4 right-4 px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500 text-white rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || (!uploadedFile && !textInput.trim())}
            className="w-full cursor-pointer py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                Processing...
              </span>
            ) : (
              'Submit'
            )}
          </button>
        </div>

        {/* Usage Info */}
        {usage && (
          <div className="mt-8 p-6 bg-gray-900 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">API Usage</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-white">
              <div>
                <p className="text-gray-400 text-sm">Input Tokens</p>
                <p className="text-lg font-semibold">{usage.promptTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Output Tokens</p>
                <p className="text-lg font-semibold">{usage.completionTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Tokens</p>
                <p className="text-lg font-semibold">{usage.totalTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Input Cost</p>
                <p className="text-lg font-semibold">${usage.inputCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Output Cost</p>
                <p className="text-lg font-semibold">${usage.outputCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Cost</p>
                <p className="text-lg font-semibold text-green-400">${usage.totalCost.toFixed(4)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <ResultsTable results={results} />
      </div>
    </div>
  );
}
