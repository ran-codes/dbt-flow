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
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '@/store/useGraphStore';
import { filterNodes, getNodeColor, getLayoutedElements, getAncestors, getDescendants } from '@/lib/graphBuilder';
import FilterBar from './FilterBar';
import CustomNode from './CustomNode';
import NodeDetailsPanel from './NodeDetailsPanel';
import type { GraphNode } from '@/lib/graphBuilder';

const nodeTypes = {
  default: CustomNode,
};

function LineageGraphInner() {
  const { nodes, edges, searchQuery, resourceTypeFilters, tagFilters, tagFilterMode, inferredTagFilters, setSelectedNode, selectedNode, addDownstreamNode, addStandaloneNode, addEdge, updateNodeMetadata, isBlankProject } = useGraphStore();
  const [filteredNodes, setFilteredNodes] = useState<Node[]>(nodes);
  const [filteredEdges, setFilteredEdges] = useState<Edge[]>(edges);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] = useState<{ x: number; y: number; flowPosition: { x: number; y: number } } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const hasAutoRelayoutRef = useRef(false);
  const { fitView, getZoom, getViewport, screenToFlowPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

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
      // Preserve existing node positions, only update data and add new nodes
      setFilteredNodes((prevNodes) => {
        const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]));
        const filteredNodeIds = new Set(filtered.map(n => n.id));

        // Start with filtered nodes, preserving positions of existing ones
        const result = filtered.map(node => {
          const existingNode = prevNodeMap.get(node.id);
          if (existingNode) {
            // Keep existing position and style, update data
            return { ...existingNode, data: node.data };
          }
          // New node from store - use its position
          return node;
        });

        // Also keep any local nodes not yet in filtered (e.g., newly added nodes)
        prevNodes.forEach(prevNode => {
          if (!filteredNodeIds.has(prevNode.id)) {
            result.push(prevNode);
          }
        });

        return result;
      });
      setFilteredEdges((prevEdges) => {
        const filteredEdgeIds = new Set(filteredE.map(e => e.id));
        // Keep any local edges not yet in filtered
        const extraEdges = prevEdges.filter(e => !filteredEdgeIds.has(e.id));
        return [...filteredE, ...extraEdges];
      });
    }
  }, [nodes, edges, searchQuery, resourceTypeFilters, tagFilters, tagFilterMode, inferredTagFilters, fitView, focusedNodeId]);

  // Reset local state when starting a new blank project
  useEffect(() => {
    if (nodes.length === 0 && isBlankProject) {
      setFilteredNodes([]);
      setFilteredEdges([]);
      hasAutoRelayoutRef.current = false;
    }
  }, [nodes.length, isBlankProject]);

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
      const ancestors = getAncestors(node.id, filteredNodes, filteredEdges);
      const descendants = getDescendants(node.id, filteredNodes, filteredEdges);

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
    [setSelectedNode, filteredNodes, filteredEdges]
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
      const ancestors = getAncestors(nodeId, nodes, edges);
      const descendants = getDescendants(nodeId, nodes, edges);
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
    [filteredNodes, filteredEdges, nodes, edges, fitView, setSelectedNode]
  );

  const handleHideParents = useCallback(
    (nodeId: string) => {
      setContextMenu(null);

      // Get ancestors (parents) and include the clicked node
      const ancestors = getAncestors(nodeId, filteredNodes, filteredEdges);

      // Close details card if it's one of the nodes being hidden
      if (selectedNode && ancestors.has(selectedNode.id)) {
        setSelectedNode(null);
      }

      // Add to hidden nodes
      setHiddenNodes((prev) => new Set([...prev, ...ancestors]));
    },
    [filteredNodes, filteredEdges, selectedNode, setSelectedNode]
  );

  const handleHideChildren = useCallback(
    (nodeId: string) => {
      setContextMenu(null);

      // Get descendants (children) and include the clicked node
      const descendants = getDescendants(nodeId, filteredNodes, filteredEdges);

      // Close details card if it's one of the nodes being hidden
      if (selectedNode && descendants.has(selectedNode.id)) {
        setSelectedNode(null);
      }

      // Add to hidden nodes
      setHiddenNodes((prev) => new Set([...prev, ...descendants]));
    },
    [filteredNodes, filteredEdges, selectedNode, setSelectedNode]
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

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Partial<GraphNode['data']>) => {
      updateNodeMetadata(nodeId, data);
      // Also update local filtered nodes
      setFilteredNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...data } }
            : n
        )
      );
      // Update selectedNode if it's the one being edited
      if (selectedNode?.id === nodeId) {
        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } } as any);
      }
    },
    [updateNodeMetadata, selectedNode, setSelectedNode]
  );

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

  // Handle new edge connections via drag-from-handle
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdge(connection.source, connection.target);
        // Also update local filtered edges
        const newEdge = {
          id: `${connection.source}-${connection.target}`,
          source: connection.source,
          target: connection.target,
          type: 'smoothstep',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
          style: { stroke: '#64748b', strokeWidth: 2 },
        };
        setFilteredEdges((prev) => [...prev, newEdge as Edge]);
      }
    },
    [addEdge]
  );

  // Close context menus on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setCanvasContextMenu(null);
    };
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

  // Get center position of current viewport for adding new nodes
  const getViewportCenter = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    // Fallback if container ref not available
    return { x: 250, y: 150 };
  }, [screenToFlowPosition]);

  // Handler for adding a standalone node (for blank projects)
  const handleAddStandaloneNode = useCallback(
    (position?: { x: number; y: number }) => {
      const nodePosition = position || getViewportCenter();
      setCanvasContextMenu(null);

      const newNodeId = addStandaloneNode(nodePosition);

      // Update local filtered nodes to include the new node
      const newNode = {
        id: newNodeId,
        type: 'default',
        position: nodePosition,
        data: {
          label: 'New Node',
          type: 'model',
          isUserCreated: true,
          materialized: false,
        },
      };

      setFilteredNodes((prev) => [...prev, newNode as Node]);
    },
    [addStandaloneNode, getViewportCenter]
  );

  // Reset highlighting when clicking on background/pane
  // NOTE: Must be defined before any early returns to satisfy React hooks rules
  const onPaneClick = useCallback(() => {
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
  }, []);

  // Empty state for blank projects
  if (!nodes.length && isBlankProject) {
    return (
      <div ref={containerRef} className="w-full h-full relative">
        <ReactFlow
          nodes={[]}
          edges={[]}
          nodeTypes={nodeTypes}
          onPaneContextMenu={(event) => {
            event.preventDefault();
            // Get flow position from screen coordinates
            const bounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
            if (bounds) {
              const x = event.clientX - bounds.left;
              const y = event.clientY - bounds.top;
              setCanvasContextMenu({
                x: event.clientX,
                y: event.clientY,
                flowPosition: { x: x - 100, y: y - 50 }, // Center the node on click
              });
            }
          }}
          fitView
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls />
        </ReactFlow>

        {/* Empty state overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white border border-slate-200 rounded-lg px-8 py-6 text-center shadow-sm pointer-events-auto">
            <p className="text-slate-900 font-medium mb-1">No nodes yet</p>
            <p className="text-sm text-slate-500 mb-4">Right-click anywhere to add a node</p>
            <button
              onClick={() => handleAddStandaloneNode()}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
            >
              + Add first node
            </button>
          </div>
        </div>

        {/* Canvas context menu */}
        {canvasContextMenu && (
          <div
            className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
            style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
          >
            <button
              onClick={() => handleAddStandaloneNode(canvasContextMenu.flowPosition)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors text-slate-700"
            >
              Add node
            </button>
          </div>
        )}
      </div>
    );
  }

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

  return (
    <div ref={containerRef} className="w-full h-full">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          const bounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
          if (bounds) {
            const x = event.clientX - bounds.left;
            const y = event.clientY - bounds.top;
            setCanvasContextMenu({
              x: event.clientX,
              y: event.clientY,
              flowPosition: { x: x - 100, y: y - 50 },
            });
          }
        }}
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
        <NodeDetailsPanel
          node={selectedNode as GraphNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={handleUpdateNode}
        />
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

      {/* Canvas Context Menu (for adding standalone nodes) */}
      {canvasContextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
          style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleAddStandaloneNode(canvasContextMenu.flowPosition)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors text-slate-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Node
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
            onClick={() => handleAddStandaloneNode()}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1"
            title="Add a new standalone node"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Node
          </button>
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
