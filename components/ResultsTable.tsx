'use client';

import { UserStory } from '@/lib/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faThumbtack } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

interface ResultsTableProps {
  results: UserStory[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  if (!results || results.length === 0) {
    return null;
  }

  // Get all unique column headers from the results
  const getHeaders = () => {
    const headers = new Set<string>();
    results.forEach(story => {
      Object.keys(story).forEach(key => headers.add(key));
    });
    return Array.from(headers);
  };

  const headers = getHeaders();

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const copyToClipboard = () => {
    const rowsToCopy = selectedRows.size > 0
      ? results.filter((_, index) => selectedRows.has(index))
      : results;

    // Create TSV (Tab-separated values) for better Excel/Sheets compatibility
    const headerRow = headers.join('\t');
    const dataRows = rowsToCopy.map(row =>
      headers.map(header => row[header] || '').join('\t')
    ).join('\n');

    const tsvContent = `${headerRow}\n${dataRows}`;

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mt-12 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Results</h2>
        <button
          onClick={copyToClipboard}
          className="flex cursor-pointer items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors duration-200"
        >
          <FontAwesomeIcon icon={faCopy} />
          {copied ? 'Copied!' : `Copy ${selectedRows.size > 0 ? 'Selected' : 'All'}`}
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="p-3 text-left border border-gray-600">Select</th>
              {headers.map((header) => (
                <th
                  key={header}
                  className={`p-3 text-left border border-gray-600 ${
                    header === 'supportingQuote' ? 'bg-yellow-600' : ''
                  } ${header === 'supportingQuote' ? '' : 'whitespace-nowrap'}`}
                >
                  {header.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}
                  {header === 'supportingQuote' && <> <FontAwesomeIcon icon={faThumbtack} /></>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((story, index) => (
              <tr
                key={index}
                className={`${
                  selectedRows.has(index) ? 'bg-blue-100' : 'bg-white'
                } hover:bg-gray-100 transition-colors duration-150`}
              >
                <td className="p-3 border border-gray-300">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(index)}
                    onChange={() => toggleRow(index)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>
                {headers.map((header) => (
                  <td
                    key={header}
                    className={`p-3 border border-gray-300 ${
                      header === 'supportingQuote' ? 'max-w-md italic text-gray-700 bg-yellow-50' : ''
                    }`}
                  >
                    {story[header] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRows.size > 0 && (
        <p className="mt-2 text-white text-sm">
          {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
