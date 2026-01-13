'use client';

import { useState, useEffect } from 'react';
import type { GraphNode } from '@/lib/graphBuilder';
import { getNodeColor } from '@/lib/graphBuilder';

interface NodeDetailsPanelProps {
  node: GraphNode;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<GraphNode['data']>) => void;
}

const NODE_TYPES = ['model', 'seed', 'snapshot', 'source', 'test', 'exposure', 'metric'];

export default function NodeDetailsPanel({ node, onClose, onUpdate }: NodeDetailsPanelProps) {
  const isEditable = node.data.isUserCreated;
  const [showRawManifest, setShowRawManifest] = useState(false);

  // Local state for editable fields
  const [label, setLabel] = useState(node.data.label);
  const [type, setType] = useState(node.data.type);
  const [description, setDescription] = useState(node.data.description || '');
  const [tagsInput, setTagsInput] = useState(node.data.tags?.join(', ') || '');
  const [pseudoCode, setPseudoCode] = useState(node.data.sql || '');

  // Sync state when node changes
  useEffect(() => {
    setLabel(node.data.label);
    setType(node.data.type);
    setDescription(node.data.description || '');
    setTagsInput(node.data.tags?.join(', ') || '');
    setPseudoCode(node.data.sql || '');
  }, [node.id, node.data.label, node.data.type, node.data.description, node.data.tags, node.data.sql]);

  // Auto-save on blur for editable fields
  const handleSave = (field: string, value: string | string[]) => {
    if (!isEditable) return;

    if (field === 'tags') {
      const tags = (value as string)
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      onUpdate(node.id, { tags });
    } else {
      onUpdate(node.id, { [field]: value });
    }
  };

  return (
    <div className="absolute top-4 right-4 w-96 bg-white rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 mr-2">
          {isEditable ? (
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => handleSave('label', label)}
              className="text-lg font-bold text-gray-900 w-full border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none pb-1"
            />
          ) : (
            <h3 className="text-lg font-bold text-gray-900">{node.data.label}</h3>
          )}

          {isEditable ? (
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                handleSave('type', e.target.value);
              }}
              className="mt-1 px-2 py-1 text-xs font-semibold rounded bg-gray-500 text-white border-none cursor-pointer"
            >
              {NODE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : (
            <span
              className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded text-white"
              style={{ backgroundColor: getNodeColor(node.data.type, node.data.inferredTags) }}
            >
              {node.data.type}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
        {isEditable ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => handleSave('description', description)}
            placeholder="Add a description..."
            rows={3}
            className="w-full text-sm text-gray-600 border border-gray-200 rounded p-2 focus:border-blue-500 focus:outline-none resize-none"
          />
        ) : (
          node.data.description ? (
            <p className="text-sm text-gray-600">{node.data.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description</p>
          )
        )}
      </div>

      {/* Database & Schema (read-only, only for non-user-created) */}
      {!isEditable && node.data.database && (
        <div className="mb-2">
          <span className="text-sm text-gray-500">Database: </span>
          <span className="text-sm text-gray-900">{node.data.database}</span>
        </div>
      )}

      {!isEditable && node.data.schema && (
        <div className="mb-2">
          <span className="text-sm text-gray-500">Schema: </span>
          <span className="text-sm text-gray-900">{node.data.schema}</span>
        </div>
      )}

      {/* Inferred Layer (read-only, only for non-user-created) */}
      {!isEditable && node.data.inferredTags && node.data.inferredTags.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Inferred Layer</h4>
          <div className="flex flex-wrap gap-2">
            {node.data.inferredTags.map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-md font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags</h4>
        {isEditable ? (
          <div>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={() => handleSave('tags', tagsInput)}
              placeholder="tag1, tag2, tag3"
              className="w-full text-sm border border-gray-200 rounded p-2 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">Separate with commas</p>
          </div>
        ) : (
          node.data.tags && node.data.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {node.data.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No tags</p>
          )
        )}
      </div>

      {/* SQL / Pseudo Code */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          {isEditable ? 'Pseudo Code' : 'SQL'}
        </h4>
        {isEditable ? (
          <textarea
            value={pseudoCode}
            onChange={(e) => setPseudoCode(e.target.value)}
            onBlur={() => handleSave('sql', pseudoCode)}
            placeholder="Write pseudo code or notes..."
            rows={6}
            className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded p-3 focus:border-blue-500 focus:outline-none resize-none"
          />
        ) : (
          node.data.sql ? (
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
              <code>{node.data.sql}</code>
            </pre>
          ) : (
            <p className="text-sm text-gray-400 italic">No SQL</p>
          )
        )}
      </div>

      {/* Raw Manifest (collapsible) */}
      {!isEditable && node.data.rawManifest && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowRawManifest(!showRawManifest)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showRawManifest ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Raw Manifest JSON
          </button>
          {showRawManifest && (
            <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
              <code>{JSON.stringify(node.data.rawManifest, null, 2)}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
