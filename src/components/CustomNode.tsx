import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNode } from '@/lib/graphBuilder';
import { getNodeColor } from '@/lib/graphBuilder';

function CustomNode({ data, selected }: NodeProps<GraphNode['data']>) {
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
          backgroundColor: getNodeColor(data.type, data.inferredTags),
          border: '2px solid #1e293b',
          minWidth: '180px',
          maxWidth: '180px',
        }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="text-white font-semibold text-sm truncate" title={data.label}>
            {data.label}
          </div>

          {/* Inferred Tags (orange/amber) */}
          {data.inferredTags && data.inferredTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.inferredTags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded font-medium"
                  title={`Inferred: ${tag}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Regular Tags (white/transparent) */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-white/25 text-white text-[10px] rounded font-medium"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {data.tags.length > 3 && (
                <span
                  className="px-1.5 py-0.5 bg-white/25 text-white text-[10px] rounded font-medium"
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
