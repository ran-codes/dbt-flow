'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type NodeMouseHandler,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '@/store/useGraphStore';
import { filterNodes } from '@/lib/graphBuilder';

export default function LineageGraph() {
  const { nodes, edges, searchQuery, setSelectedNode, selectedNode } = useGraphStore();
  const [filteredNodes, setFilteredNodes] = useState<Node[]>(nodes);
  const [filteredEdges, setFilteredEdges] = useState<Edge[]>(edges);

  // Update filtered data when search query or data changes
  useEffect(() => {
    const { nodes: filtered, edges: filteredE } = filterNodes(nodes, edges, searchQuery);
    setFilteredNodes(filtered);
    setFilteredEdges(filteredE);
  }, [nodes, edges, searchQuery]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      setSelectedNode(node as any);
    },
    [setSelectedNode]
  );

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No graph data loaded</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background color="#94a3b8" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            return (node.style?.background as string) || '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
      </ReactFlow>

      {/* Node details panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-96 bg-white rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedNode.data.label}</h3>
              <span
                className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded"
                style={{
                  backgroundColor: selectedNode.style?.background as string,
                  color: 'white',
                }}
              >
                {selectedNode.data.type}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {selectedNode.data.description && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-600">{selectedNode.data.description}</p>
            </div>
          )}

          {selectedNode.data.database && (
            <div className="mb-2">
              <span className="text-sm text-gray-500">Database: </span>
              <span className="text-sm text-gray-900">{selectedNode.data.database}</span>
            </div>
          )}

          {selectedNode.data.schema && (
            <div className="mb-2">
              <span className="text-sm text-gray-500">Schema: </span>
              <span className="text-sm text-gray-900">{selectedNode.data.schema}</span>
            </div>
          )}

          {selectedNode.data.sql && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">SQL</h4>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                <code>{selectedNode.data.sql}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            Nodes: <span className="font-semibold text-gray-900">{filteredNodes.length}</span>
          </span>
          <span className="text-gray-600">
            Edges: <span className="font-semibold text-gray-900">{filteredEdges.length}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
