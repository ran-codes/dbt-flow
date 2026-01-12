import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { GraphNode } from '@/lib/graphBuilder';
import { getNodeColor } from '@/lib/graphBuilder';
import { useGraphStore } from '@/store/useGraphStore';

function CustomNode({ data, selected, id }: NodeProps<GraphNode['data']>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [localLabel, setLocalLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const { editingNodeId, setEditingNodeId, updateNodeLabel } = useGraphStore();
  const isEditing = editingNodeId === id;

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync local label with data
  useEffect(() => {
    setLocalLabel(data.label);
  }, [data.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.isUserCreated) {
      setEditingNodeId(id);
    }
  };

  const handleBlur = () => {
    if (localLabel.trim()) {
      updateNodeLabel(id, localLabel.trim());
    } else {
      setLocalLabel(data.label); // Revert if empty
    }
    setEditingNodeId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalLabel(data.label);
      setEditingNodeId(null);
    }
  };

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
          border: data.isUserCreated ? '2px dashed #1e293b' : '2px solid #1e293b',
          opacity: data.isUserCreated ? 0.7 : 1,
          minWidth: '180px',
          maxWidth: '180px',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex flex-col gap-1.5">
          <div
            className="text-white font-semibold text-sm truncate"
            onDoubleClick={handleDoubleClick}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={localLabel}
                onChange={(e) => setLocalLabel(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-none outline-none text-white font-semibold text-sm w-full"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              data.label
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
