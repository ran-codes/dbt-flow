'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  type NodeMouseHandler,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '@/store/useGraphStore';
import { filterNodes, getNodeColor, getLayoutedElements, getAncestors, getDescendants } from '@/lib/graphBuilder';
import FilterBar from './FilterBar';
import CustomNode from './CustomNode';

const nodeTypes = {
  default: CustomNode,
};

function LineageGraphInner() {
  const { nodes, edges, searchQuery, resourceTypeFilters, tagFilters, tagFilterMode, inferredTagFilters, setSelectedNode, selectedNode, addDownstreamNode } = useGraphStore();
  const [filteredNodes, setFilteredNodes] = useState<Node[]>(nodes);
  const [filteredEdges, setFilteredEdges] = useState<Edge[]>(edges);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const hasAutoRelayoutRef = useRef(false);
  const { fitView, getZoom } = useReactFlow();

  // Update filtered data when search query, resource filters, or data changes
  useEffect(() => {
    // Skip store sync when in focused mode - let local state manage the view
    if (focusedNodeId) return;

    const { nodes: filtered, edges: filteredE } = filterNodes(nodes, edges, searchQuery, resourceTypeFilters, tagFilters, tagFilterMode, inferredTagFilters, 'OR');

    // Apply layout and set nodes
    if (filtered.length > 0 && !hasAutoRelayoutRef.current) {
      const layouted = getLayoutedElements(filtered as any[], filteredE as any[]);
      setFilteredNodes(layouted.nodes);
      setFilteredEdges(filteredE);

      // Fit view on initial load (max 100% zoom)
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300, maxZoom: 1 });
        hasAutoRelayoutRef.current = true;
      }, 100);
    } else {
      setFilteredNodes(filtered);
      setFilteredEdges(filteredE);
    }
  }, [nodes, edges, searchQuery, resourceTypeFilters, tagFilters, tagFilterMode, inferredTagFilters, fitView, focusedNodeId]);

  // Relayout filtered nodes to position them closer together and fit view
  const handleRelayout = useCallback(() => {
    if (filteredNodes.length === 0) return;

    const layouted = getLayoutedElements(filteredNodes as any[], filteredEdges as any[]);
    setFilteredNodes(layouted.nodes);

    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300, maxZoom: 1 });
    }, 0);
  }, [filteredNodes, filteredEdges, fitView]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      setSelectedNode(node as any);

      // Get all ancestors (upstream) and descendants (downstream)
      const ancestors = getAncestors(node.id, filteredEdges);
      const descendants = getDescendants(node.id, filteredEdges);

      // Combine all related nodes
      const allRelatedNodes = new Set([...ancestors, ...descendants]);
      setHighlightedNodes(allRelatedNodes);

      // Find all edges that connect the related nodes
      const relatedEdges = new Set(
        filteredEdges
          .filter((edge) => allRelatedNodes.has(edge.source) && allRelatedNodes.has(edge.target))
          .map((edge) => edge.id)
      );
      setHighlightedEdges(relatedEdges);
    },
    [setSelectedNode, filteredEdges]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    []
  );

  const handleFocusOnNode = useCallback(
    (nodeId: string) => {
      setFocusedNodeId(nodeId);
      setContextMenu(null);

      // Close details panel if open
      setSelectedNode(null);

      // Get all ancestors and descendants
      const ancestors = getAncestors(nodeId, edges);
      const descendants = getDescendants(nodeId, edges);
      const focusedNodes = new Set([...ancestors, ...descendants]);

      // Filter nodes to only show the lineage
      const lineageNodes = filteredNodes.filter((node) => focusedNodes.has(node.id));
      const lineageEdges = filteredEdges.filter(
        (edge) => focusedNodes.has(edge.source) && focusedNodes.has(edge.target)
      );

      // Relayout the focused nodes
      const layouted = getLayoutedElements(lineageNodes as any[], lineageEdges as any[]);
      setFilteredNodes(layouted.nodes);
      setFilteredEdges(lineageEdges);

      // Clear highlights and fit view (max 100% zoom)
      setHighlightedNodes(new Set());
      setHighlightedEdges(new Set());
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300, maxZoom: 1 });
      }, 100);
    },
    [filteredNodes, filteredEdges, edges, fitView, setSelectedNode]
  );

  const handleHideParents = useCallback(
    (nodeId: string) => {
      setContextMenu(null);

      // Get ancestors (parents) and include the clicked node
      const ancestors = getAncestors(nodeId, filteredEdges);

      // Close details card if it's one of the nodes being hidden
      if (selectedNode && ancestors.has(selectedNode.id)) {
        setSelectedNode(null);
      }

      // Add to hidden nodes
      setHiddenNodes((prev) => new Set([...prev, ...ancestors]));
    },
    [filteredEdges, selectedNode, setSelectedNode]
  );

  const handleHideChildren = useCallback(
    (nodeId: string) => {
      setContextMenu(null);

      // Get descendants (children) and include the clicked node
      const descendants = getDescendants(nodeId, filteredEdges);

      // Close details card if it's one of the nodes being hidden
      if (selectedNode && descendants.has(selectedNode.id)) {
        setSelectedNode(null);
      }

      // Add to hidden nodes
      setHiddenNodes((prev) => new Set([...prev, ...descendants]));
    },
    [filteredEdges, selectedNode, setSelectedNode]
  );

  const handleShowFullGraph = useCallback(() => {
    setFocusedNodeId(null);
    setContextMenu(null);

    // Clear hidden nodes
    setHiddenNodes(new Set());

    // Re-filter to show all nodes based on current filters
    const { nodes: filtered, edges: filteredE } = filterNodes(
      nodes,
      edges,
      searchQuery,
      resourceTypeFilters,
      tagFilters,
      tagFilterMode,
      inferredTagFilters,
      'OR'
    );

    const layouted = getLayoutedElements(filtered as any[], filteredE as any[]);
    setFilteredNodes(layouted.nodes);
    setFilteredEdges(filteredE);

    // Clear highlights and fit view (max 100% zoom)
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300, maxZoom: 1 });
    }, 100);
  }, [nodes, edges, searchQuery, resourceTypeFilters, tagFilters, tagFilterMode, inferredTagFilters, fitView]);

  const handleAddDownstream = useCallback(
    (parentNodeId: string) => {
      setContextMenu(null);

      const parentNode = filteredNodes.find((n) => n.id === parentNodeId);
      if (!parentNode) return;

      // Calculate position: 250px to the right of parent node
      const HORIZONTAL_OFFSET = 250;
      const position = {
        x: parentNode.position.x + HORIZONTAL_OFFSET,
        y: parentNode.position.y,
      };

      // Check for existing nodes at similar position and offset vertically if needed
      const VERTICAL_OFFSET = 100;
      const nodesAtSameX = filteredNodes.filter(
        (n) => Math.abs(n.position.x - position.x) < 50
      );
      if (nodesAtSameX.length > 0) {
        const maxY = Math.max(...nodesAtSameX.map((n) => n.position.y));
        position.y = maxY + VERTICAL_OFFSET;
      }

      const newNodeId = addDownstreamNode(parentNodeId, position);

      // Update local filtered nodes to include the new node
      const newNode = {
        id: newNodeId,
        type: 'default',
        position,
        data: {
          label: 'Untitled',
          type: 'model',
          isUserCreated: true,
          materialized: false,
          tags: ['planned'],
        },
        style: {
          padding: 0,
          border: 'none',
          background: 'transparent',
        },
      };

      const newEdge = {
        id: `${parentNodeId}-${newNodeId}`,
        source: parentNodeId,
        target: newNodeId,
        type: 'smoothstep',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#64748b',
        },
        style: { stroke: '#64748b', strokeWidth: 2 },
      };

      setFilteredNodes((prev) => [...prev, newNode as Node]);
      setFilteredEdges((prev) => [...prev, newEdge as Edge]);
    },
    [filteredNodes, addDownstreamNode]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setFilteredNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setFilteredEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Track zoom level
  useEffect(() => {
    const updateZoom = () => {
      const zoom = getZoom();
      setZoomLevel(Math.round(zoom * 100));
    };

    // Update zoom on mount and on interval
    updateZoom();
    const interval = setInterval(updateZoom, 100);

    return () => clearInterval(interval);
  }, [getZoom]);

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No graph data loaded</p>
      </div>
    );
  }

  // Apply highlighting to nodes and edges, and filter out hidden nodes
  const visibleNodes = filteredNodes.filter((node) => !hiddenNodes.has(node.id));
  const visibleEdges = filteredEdges.filter(
    (edge) => !hiddenNodes.has(edge.source) && !hiddenNodes.has(edge.target)
  );

  const styledNodes = visibleNodes.map((node) => ({
    ...node,
    style: {
      ...node.style,
      opacity: highlightedNodes.size === 0 || highlightedNodes.has(node.id) ? 1 : 0.2,
    },
  }));

  const styledEdges = visibleEdges.map((edge) => ({
    ...edge,
    type: 'default', // Use curved bezier edges
    style: {
      ...edge.style,
      stroke: highlightedEdges.has(edge.id) ? '#3b82f6' : '#64748b',
      strokeWidth: highlightedEdges.has(edge.id) ? 3 : 2,
      opacity: highlightedEdges.size === 0 || highlightedEdges.has(edge.id) ? 1 : 0.2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: highlightedEdges.has(edge.id) ? '#3b82f6' : '#64748b',
    },
    animated: highlightedEdges.has(edge.id),
  }));

  // Reset highlighting when clicking on background/pane
  const onPaneClick = useCallback(() => {
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
        }}
      >
        <Background color="#94a3b8" gap={16} />
        <Controls position="top-right" />
        <MiniMap
          position="top-left"
          pannable
          zoomable
          nodeColor={(node: any) => getNodeColor(node.data?.type || 'default', node.data?.inferredTags)}
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

          {selectedNode.data.inferredTags && selectedNode.data.inferredTags.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Inferred Layer</h4>
              <div className="flex flex-wrap gap-2">
                {selectedNode.data.inferredTags.map((tag: string) => (
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

          {selectedNode.data.tags && selectedNode.data.tags.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedNode.data.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
            onClick={() => handleFocusOnNode(contextMenu.nodeId)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Focus on Node
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
            onClick={() => handleHideParents(contextMenu.nodeId)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Hide This and Upstream
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
            onClick={() => handleHideChildren(contextMenu.nodeId)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Hide This and Downstream
          </button>
          {(focusedNodeId || hiddenNodes.size > 0) && (
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
              onClick={handleShowFullGraph}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              Show Full Graph
            </button>
          )}
          <hr className="my-2 border-slate-200" />
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2 text-blue-600"
            onClick={() => handleAddDownstream(contextMenu.nodeId)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Node Downstream
          </button>
          <hr className="my-2 border-slate-200" />
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2 text-slate-600"
            onClick={() => {
              const node = filteredNodes.find((n) => n.id === contextMenu.nodeId);
              if (node) {
                navigator.clipboard.writeText(node.data.label);
                setContextMenu(null);
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Node Name
          </button>
        </div>
      )}

      {/* Stats overlay with relayout button */}
      <div className="absolute bottom-16 left-4 bg-white rounded-lg shadow-lg px-4 py-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            Nodes: <span className="font-semibold text-gray-900">{filteredNodes.length}</span>
          </span>
          <span className="text-gray-600">
            Edges: <span className="font-semibold text-gray-900">{filteredEdges.length}</span>
          </span>
          <span className="text-gray-600">
            Zoom: <span className="font-semibold text-gray-900">{zoomLevel}%</span>
          </span>
          <button
            onClick={handleRelayout}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
            title="Optimize node positions and spacing"
          >
            Optimize Layout
          </button>
          {(focusedNodeId || hiddenNodes.size > 0) && (
            <button
              onClick={handleShowFullGraph}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium rounded-md transition-colors"
              title="Show full graph"
            >
              Show Full Graph
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar />
    </div>
  );
}

export default function LineageGraph() {
  return (
    <ReactFlowProvider>
      <LineageGraphInner />
    </ReactFlowProvider>
  );
}
