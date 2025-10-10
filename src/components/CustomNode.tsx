import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNode } from '@/lib/graphBuilder';
import { getNodeColor } from '@/lib/graphBuilder';

function CustomNode({ data, selected }: NodeProps<GraphNode['data']>) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 transition-all ${
        selected ? 'border-blue-500 shadow-lg' : 'border-slate-800'
      }`}
      style={{
        backgroundColor: getNodeColor(data.type),
        minWidth: '180px',
        maxWidth: '180px',
      }}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2" />

      <div className="flex flex-col gap-1">
        <div className="text-white font-medium text-sm truncate" title={data.label}>
          {data.label}
        </div>

        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-white/20 text-white text-[10px] rounded"
                title={tag}
              >
                {tag}
              </span>
            ))}
            {data.tags.length > 3 && (
              <span
                className="px-1.5 py-0.5 bg-white/20 text-white text-[10px] rounded"
                title={data.tags.slice(3).join(', ')}
              >
                +{data.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
}

export default memo(CustomNode);
