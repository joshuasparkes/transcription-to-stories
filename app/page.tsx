'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
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

type GptModel = 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano';
type Mode = 'query' | 'user-stories';

// Pre-loaded VTT files available in the public folder
const PRELOADED_FILES = [
  'Cashiering transcript 1.vtt',
  'Cashiering transcript 2.vtt',
  'AP transcript 1.vtt',
  'AP transcript 2.vtt',
  'Billing transcript 1.vtt',
  'Billing transcript 2.vtt',
  'RAMA transcript 1.vtt',
  'RAMA transcript 2.vtt',
  'Ebilling Transcript 1.vtt',
  'Ebilling transcript 2.vtt',
];

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserStory[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState<GptModel>('gpt-5-mini');
  const [customQuery, setCustomQuery] = useState('');
  const [customQueryResponse, setCustomQueryResponse] = useState('');
  const [customQueryUsage, setCustomQueryUsage] = useState<UsageInfo | null>(null);
  const [customQueryLoading, setCustomQueryLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('query');
  const [selectedPreloadedFiles, setSelectedPreloadedFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update page title to show loading indicator
  useEffect(() => {
    const originalTitle = 'Transcription Analysis Tool';
    if (loading) {
      document.title = '⏳ Extracting User Stories...';
    } else if (customQueryLoading) {
      document.title = '⏳ Processing Query...';
    } else {
      document.title = originalTitle;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [loading, customQueryLoading]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (textInput.trim()) {
      setError('Please use either file upload or text input, not both.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate all files are .vtt
    const invalidFiles = Array.from(files).filter(file => !file.name.endsWith('.vtt'));
    if (invalidFiles.length > 0) {
      setError('Please upload only .vtt files');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploadedFiles(Array.from(files));
    setError('');
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (uploadedFiles.length > 0) {
      setError('Please use either file upload or text input, not both.');
      return;
    }
    setTextInput(e.target.value);
    setError('');
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError('');
  };

  const handleRemoveAllFiles = () => {
    setUploadedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError('');
  };

  const handleClearText = () => {
    setTextInput('');
    setError('');
  };

  const togglePreloadedFile = (filename: string) => {
    if (textInput.trim()) {
      setError('Please use either file upload or text input, not both.');
      return;
    }

    const newSelected = new Set(selectedPreloadedFiles);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedPreloadedFiles(newSelected);
    setError('');
  };

  const loadPreloadedFiles = async () => {
    if (selectedPreloadedFiles.size === 0) {
      setError('Please select at least one pre-loaded file');
      return;
    }

    try {
      const fileObjects: File[] = [];

      for (const filename of selectedPreloadedFiles) {
        const response = await fetch(`/${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filename}`);
        }
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'text/vtt' });
        fileObjects.push(file);
      }

      setUploadedFiles(fileObjects);
      setError('');
      console.log('✅ [Frontend] Loaded', fileObjects.length, 'pre-loaded files');
    } catch (err) {
      console.error('❌ [Frontend] Failed to load pre-loaded files:', err);
      setError('Failed to load pre-loaded files');
    }
  };

  const getTranscriptText = async (): Promise<string | null> => {
    let transcriptText = '';

    if (uploadedFiles.length > 0) {
      console.log('📁 [Frontend] Processing', uploadedFiles.length, 'uploaded file(s)');
      try {
        const transcriptParts: string[] = [];

        for (const file of uploadedFiles) {
          console.log('📄 [Frontend] Processing file:', file.name);
          const fileContent = await file.text();
          console.log('📄 [Frontend] File content loaded, length:', fileContent.length);
          const parsedContent = parseVTT(fileContent);
          transcriptParts.push(parsedContent);
          console.log('✅ [Frontend] VTT parsed, cleaned text length:', parsedContent.length);
        }

        transcriptText = transcriptParts.join('\n\n');
        console.log('✅ [Frontend] Combined transcript length:', transcriptText.length);
      } catch (err) {
        console.error('❌ [Frontend] Failed to read file:', err);
        setError('Failed to read files');
        return null;
      }
    } else if (textInput.trim()) {
      console.log('📝 [Frontend] Using text input, length:', textInput.length);
      // Also parse VTT if the text input looks like VTT content
      const trimmedInput = textInput.trim();
      if (trimmedInput.startsWith('WEBVTT') || trimmedInput.includes('-->')) {
        transcriptText = parseVTT(trimmedInput);
        console.log('✅ [Frontend] VTT parsed from text input, cleaned text length:', transcriptText.length);
      } else {
        transcriptText = trimmedInput;
      }
    } else {
      console.warn('⚠️  [Frontend] No input provided');
      setError('Please provide a transcript file or text');
      return null;
    }

    return transcriptText;
  };

  const handleExtractUserStories = async () => {
    console.log('🚀 [Frontend] Extract User Stories button clicked');
    setError('');
    setResults([]);
    setUsage(null);

    const transcriptText = await getTranscriptText();
    if (!transcriptText) return;

    setLoading(true);
    console.log('📤 [Frontend] Sending transcript to API...');

    try {
      const response = await fetch('/api/extract-requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptText,
          model: selectedModel
        }),
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

  const handleCustomQuery = async () => {
    console.log('🚀 [Frontend] Custom Query button clicked');
    setError('');
    setCustomQueryResponse('');
    setCustomQueryUsage(null);

    if (!customQuery.trim()) {
      setError('Please enter a custom query');
      return;
    }

    const transcriptText = await getTranscriptText();
    if (!transcriptText) return;

    setCustomQueryLoading(true);
    console.log('📤 [Frontend] Sending custom query to API...');

    try {
      const response = await fetch('/api/custom-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptText,
          query: customQuery,
          model: selectedModel
        }),
      });

      console.log('📥 [Frontend] API response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to process custom query');
      }

      const data = await response.json();
      console.log('📊 [Frontend] Response data:', data);

      setCustomQueryResponse(data.response || '');
      setCustomQueryUsage(data.usage || null);

      console.log('✅ [Frontend] Custom query response set successfully');
    } catch (err) {
      console.error('❌ [Frontend] Error processing custom query:', err);
      setError('Failed to process custom query. Please try again.');
    } finally {
      setCustomQueryLoading(false);
      console.log('🏁 [Frontend] Custom query processing complete');
    }
  };

  return (
    <div className="min-h-screen text-black bg-black px-8 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1" />
          <h1 className="font-[family-name:var(--font-raleway)] font-bold text-4xl text-white text-center flex-1">
            Transcription Analysis Tool
          </h1>
          <div className="flex-1 flex justify-end">
          </div>
        </div>

        {/* Mode Toggle and Model Selector */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          {/* Mode Toggle */}
          <div className="flex gap-4">
            <button
              onClick={() => setMode('query')}
              className={`px-8 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 ${
                mode === 'query'
                  ? 'bg-green-600 text-white shadow-lg scale-105'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Custom Query
            </button>
            <button
              onClick={() => setMode('user-stories')}
              className={`px-8 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 ${
                mode === 'user-stories'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Extract User Stories
            </button>
          </div>

          {/* Model Selector */}
          <div className="w-full md:w-auto md:min-w-[400px]">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GptModel)}
              className="w-full p-3 bg-gray-900 text-white rounded-xl border-2 border-gray-700 focus:border-blue-500 focus:outline-none transition-all duration-200"
            >
              <option value="gpt-5">GPT-5 (Highest quality, $2.50/$10.00 per 1M tokens)</option>
              <option value="gpt-5-mini">GPT-5 Mini (Balanced, $0.10/$0.40 per 1M tokens)</option>
              <option value="gpt-5-nano">GPT-5 Nano (Fastest, $0.05/$0.20 per 1M tokens)</option>
            </select>
          </div>
        </div>

        {/* Main Form */}
        <div className="space-y-6">
          {/* Pre-loaded Files Selection */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-medium">Pre-loaded Files (click to select)</h3>
              {selectedPreloadedFiles.size > 0 && (
                <button
                  onClick={loadPreloadedFiles}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Load {selectedPreloadedFiles.size} Selected File{selectedPreloadedFiles.size > 1 ? 's' : ''}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {PRELOADED_FILES.map((filename) => (
                <button
                  key={filename}
                  onClick={() => togglePreloadedFile(filename)}
                  className={`p-3 rounded-lg text-sm text-left transition-all duration-200 cursor-pointer ${
                    selectedPreloadedFiles.has(filename)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {filename}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <label
              htmlFor="file-upload"
              className="block w-full p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-200 focus-within:border-blue-500 focus-within:shadow-lg"
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <FontAwesomeIcon icon={faUpload} className="text-3xl text-gray-500" />
                <span className="text-gray-700 font-medium">
                  {uploadedFiles.length > 0
                    ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} selected`
                    : 'Upload .vtt file(s) or drag and drop'}
                </span>
                <span className="text-sm text-gray-500">Click to browse files (multiple allowed)</span>
              </div>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".vtt"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Display uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-white font-medium">Uploaded Files:</h4>
                  <button
                    onClick={handleRemoveAllFiles}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    Remove All
                  </button>
                </div>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-gray-800 p-3 rounded-lg"
                    >
                      <span className="text-white text-sm">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200"
                      >
                        <FontAwesomeIcon icon={faTimes} className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="relative">
            <textarea
              value={textInput}
              onChange={handleTextChange}
              placeholder="Or paste your transcript here..."
              className="w-full h-32 p-4 bg-white rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none focus:shadow-lg transition-all duration-200 resize-none"
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

          {/* Custom Query Input - Only show in query mode */}
          {mode === 'query' && (
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
              <label className="block text-white font-medium mb-2">
                Custom Query
              </label>
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Ask a specific question about the transcript..."
                className="w-full h-32 p-4 bg-white text-black rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-all duration-200 resize-none"
              />
            </div>
          )}

          {/* Submit Button */}
          {mode === 'query' ? (
            <button
              onClick={handleCustomQuery}
              disabled={customQueryLoading || (uploadedFiles.length === 0 && !textInput.trim()) || !customQuery.trim()}
              className="w-full cursor-pointer py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            >
              {customQueryLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  Processing Query...
                </span>
              ) : (
                'Submit Custom Query'
              )}
            </button>
          ) : (
            <button
              onClick={handleExtractUserStories}
              disabled={loading || (uploadedFiles.length === 0 && !textInput.trim())}
              className="w-full cursor-pointer py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  Extracting User Stories...
                </span>
              ) : (
                'Extract User Stories'
              )}
            </button>
          )}
        </div>

        {/* Query Mode Results */}
        {mode === 'query' && (
          <>
            {/* Custom Query Response */}
            {customQueryResponse && (
              <div className="mt-8 p-6 bg-gray-900 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Response</h3>
                <div className="bg-white p-4 rounded-lg text-black whitespace-pre-wrap">
                  {customQueryResponse}
                </div>
              </div>
            )}

            {/* Custom Query Usage Info */}
            {customQueryUsage && (
              <div className="mt-4 p-6 bg-gray-900 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">API Usage</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-white">
                  <div>
                    <p className="text-gray-400 text-sm">Input Tokens</p>
                    <p className="text-lg font-semibold">{customQueryUsage.promptTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Output Tokens</p>
                    <p className="text-lg font-semibold">{customQueryUsage.completionTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Tokens</p>
                    <p className="text-lg font-semibold">{customQueryUsage.totalTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Input Cost</p>
                    <p className="text-lg font-semibold">${customQueryUsage.inputCost.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Output Cost</p>
                    <p className="text-lg font-semibold">${customQueryUsage.outputCost.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Cost</p>
                    <p className="text-lg font-semibold text-green-400">${customQueryUsage.totalCost.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* User Stories Mode Results */}
        {mode === 'user-stories' && (
          <>
            {/* User Stories Usage Info */}
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

            {/* Results Table */}
            <ResultsTable results={results} />
          </>
        )}
      </div>
    </div>
  );
}
