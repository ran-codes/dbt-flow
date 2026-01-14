import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNode } from '@/lib/graphBuilder';
import { getNodeColor } from '@/lib/graphBuilder';

function CustomNode({ data, selected }: NodeProps<GraphNode['data']>) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-slate-500 !border-2 !border-white"
        style={{ left: -6 }}
      />

      <div
        className={`px-3 py-2 rounded-lg transition-all ${
          selected ? 'ring-2 ring-blue-400 ring-offset-2 shadow-xl' : 'shadow-md'
        }`}
        style={{
          backgroundColor: data.isUserCreated ? '#6b7280' : getNodeColor(data.type, data.inferredTags),
          border: data.isModified
            ? '3px solid #f59e0b'  // amber border for modified nodes
            : data.isUserCreated
              ? '2px dashed #1e293b'
              : '2px solid #1e293b',
          opacity: data.isUserCreated ? 0.7 : 1,
          minWidth: '180px',
          maxWidth: '180px',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-slate-900 font-semibold text-sm truncate flex-1">
              {data.label}
            </div>
            {data.isModified && !data.isUserCreated && (
              <div className="flex-shrink-0" title="Modified from manifest">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
            )}
          </div>

          {/* Tooltip for full name */}
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none">
              {data.label}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-8 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}

          {/* Inferred Tags */}
          {data.inferredTags && data.inferredTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.inferredTags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-slate-900/20 text-slate-700 text-[10px] rounded font-medium"
                  title={`Inferred: ${tag}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Regular Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-slate-900/10 text-slate-600 text-[10px] rounded font-medium"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {data.tags.length > 3 && (
                <span
                  className="px-1.5 py-0.5 bg-slate-900/10 text-slate-600 text-[10px] rounded font-medium"
                  title={data.tags.slice(3).join(', ')}
                >
                  +{data.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-slate-500 !border-2 !border-white"
        style={{ right: -6 }}
      />
    </div>
  );
}

export default memo(CustomNode);
