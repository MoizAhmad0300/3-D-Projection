import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { compColor, personColor } from '../data.js';

const colorHex = (value) => `#${value.toString(16).padStart(6, '0')}`;
const shortLabel = (text, max = 26) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const Graph2D = ({ onNodeClick, command, selectedNode, selectedNodeId, filterTerm = '', forceLabels = false, customNodes = [], customLinks = [] }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const dragStateRef = useRef({
    mode: null,
    pointerType: null,
    primaryPointerId: null,
    pointers: new Map(),
    startX: 0,
    startY: 0,
    startYaw: 0,
    startPitch: 0,
    startPanX: 0,
    startPanY: 0,
    startZoom: 1,
    startDistance: 0,
    startCenterX: 0,
    startCenterY: 0,
  });

  const [nodes, setNodes] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 760 });
  const [hoveredId, setHoveredId] = useState(null);
  const [view, setView] = useState({
    yaw: -0.35,
    pitch: 0.22,
    zoom: 1,
    panX: 0,
    panY: 0,
    hoverX: 0,
    hoverY: 0,
  });

  const graphData = useMemo(
    () => ({
      nodes: customNodes.map((node, index) => {
        const angle = (index / customNodes.length) * Math.PI * 2;
        const depthBand = node.type === 'company' ? 150 : -110;

        return {
          ...node,
          x: Math.random() * 1200,
          y: Math.random() * 760,
          z: depthBand + Math.sin(angle * 2.7) * 90 + Math.cos(angle * 1.8) * 50,
        };
      }),
      links: customLinks.map((link) => ({ ...link })),
    }),
    [customNodes, customLinks]
  );

  const focusedGraphData = useMemo(() => {
    if (!selectedNode) return null;

    if (selectedNode.type === 'company') {
      const directors = selectedNode.directors || [];

      return {
        nodes: [
          {
            id: selectedNode.id,
            name: selectedNode.name,
            type: 'company',
            compType: selectedNode.compType,
            directors,
          },
          ...directors.map((person) => ({
            id: `p_${person.replace(/\s/g, '')}`,
            name: person,
            type: 'person',
            companies: [selectedNode.name],
          })),
        ],
        links: directors.map((person) => ({
          source: selectedNode.id,
          target: `p_${person.replace(/\s/g, '')}`,
        })),
      };
    }

    const companies = (selectedNode.companies || [])
      .map((companyName) => customNodes.find((node) => node.type === 'company' && node.name === companyName))
      .filter(Boolean);

    return {
      nodes: [
        {
          id: `p_${selectedNode.name.replace(/\s/g, '')}`,
          name: selectedNode.name,
          type: 'person',
          companies: selectedNode.companies || [],
        },
        ...companies,
      ],
      links: companies.map((company) => ({
        source: `p_${selectedNode.name.replace(/\s/g, '')}`,
        target: company.id,
      })),
    };
  }, [customNodes, selectedNode]);

  const activeGraphData = focusedGraphData || graphData;

  useEffect(() => {
    if (focusedGraphData) {
      const focusIsCompany = selectedNode?.type === 'company';
      const edgeNodes = focusedGraphData.nodes.filter((node) => node.id !== selectedNodeId);
      const popupMode = forceLabels;

      const layoutNodes = (() => {
        if (!edgeNodes.length) {
          return focusedGraphData.nodes.map((node) => ({
            ...node,
            x: popupMode ? Math.min(Math.max(dimensions.width * 0.12, 120), 190) : dimensions.width / 2,
            y: popupMode ? Math.min(Math.max(dimensions.height * 0.18, 96), 140) : dimensions.height / 2,
            z: popupMode ? 0 : node.id === selectedNodeId ? 90 : 0,
          }));
        }

        if (popupMode) {
          const selectedX = Math.min(Math.max(dimensions.width * 0.12, 120), 190);
          const selectedY = Math.min(Math.max(dimensions.height * 0.18, 96), 140);
          const leftGap = selectedNode?.type === 'company' ? 240 : 270;
          const rightMargin = 120;
          const bottomMargin = 120;
          const childStartX = Math.min(selectedX + leftGap, dimensions.width - rightMargin);
          const availableWidth = Math.max(dimensions.width - childStartX - rightMargin, 240);
          const availableHeight = Math.max(dimensions.height - selectedY - bottomMargin, 220);
          const columns = Math.max(1, Math.min(edgeNodes.length, Math.floor(availableWidth / 240) + 1, 5));
          const rows = Math.ceil(edgeNodes.length / columns);
          const xGap = columns > 1 ? Math.min(availableWidth / (columns - 1), 280) : 0;
          const yGap = rows > 1 ? Math.min(availableHeight / (rows - 1), 145) : 0;

          return focusedGraphData.nodes.map((node) => {
            if (node.id === selectedNodeId) {
              return {
                ...node,
                x: selectedX,
                y: selectedY,
                z: 0,
              };
            }

            const order = edgeNodes.findIndex((edgeNode) => edgeNode.id === node.id);
            const column = order % columns;
            const row = Math.floor(order / columns);

            return {
              ...node,
              x: childStartX + column * xGap,
              y: selectedY + row * yGap,
              z: 0,
            };
          });
        }

        if (focusIsCompany) {
          const sideMargin = Math.max(96, dimensions.width * 0.08);
          const topMargin = Math.max(86, dimensions.height * 0.14);
          const bottomMargin = Math.max(86, dimensions.height * 0.14);
          const selectedX = dimensions.width / 2;
          const selectedY = dimensions.height / 2;
          const availableWidth = Math.max(dimensions.width - sideMargin * 2, 260);
          const availableHeight = Math.max(dimensions.height - topMargin - bottomMargin, 220);
          const radiusX = Math.min(availableWidth * 0.34, 280);
          const radiusY = Math.min(availableHeight * 0.34, 190);

          return focusedGraphData.nodes.map((node) => {
            if (node.id === selectedNodeId) {
              return {
                ...node,
                x: selectedX,
                y: selectedY,
                z: 110,
              };
            }

            const order = edgeNodes.findIndex((edgeNode) => edgeNode.id === node.id);
            const angle = edgeNodes.length === 1
              ? Math.PI / 2
              : -Math.PI / 2 + ((order + 1) / edgeNodes.length) * Math.PI * 2;

            return {
              ...node,
              x: selectedX + Math.cos(angle) * radiusX,
              y: selectedY + Math.sin(angle) * radiusY,
              z: -90 + (order % 2) * 24,
            };
          });
        }

        const sideMargin = Math.max(90, dimensions.width * 0.08);
        const topMargin = Math.max(90, dimensions.height * 0.14);
        const bottomMargin = Math.max(90, dimensions.height * 0.14);
        const selectedX = Math.max(150, dimensions.width * 0.16);
        const selectedY = dimensions.height / 2;
        const gridStartX = Math.max(selectedX + 120, dimensions.width * 0.42);
        const availableWidth = Math.max(dimensions.width - gridStartX - sideMargin, 200);
        const availableHeight = Math.max(dimensions.height - topMargin - bottomMargin, 180);
        const preferredCols = Math.ceil(Math.sqrt(edgeNodes.length));
        const columns = Math.max(1, Math.min(preferredCols, edgeNodes.length, 4));
        const rows = Math.ceil(edgeNodes.length / columns);
        const xGap = columns > 1 ? Math.min(availableWidth / (columns - 1), 210) : 0;
        const usedWidth = columns > 1 ? xGap * (columns - 1) : 0;
        const gridOffsetX = gridStartX + Math.max((availableWidth - usedWidth) / 2, 0);
        const yGap = rows > 1 ? Math.min(availableHeight / (rows - 1), 125) : 0;
        const usedHeight = rows > 1 ? yGap * (rows - 1) : 0;
        const startY = topMargin + Math.max((availableHeight - usedHeight) / 2, 0);

        return focusedGraphData.nodes.map((node) => {
          if (node.id === selectedNodeId) {
            return {
              ...node,
              x: selectedX,
              y: selectedY,
              z: -70,
            };
          }

          const order = edgeNodes.findIndex((edgeNode) => edgeNode.id === node.id);
          const column = order % columns;
          const row = Math.floor(order / columns);

          return {
            ...node,
            x: gridOffsetX + column * xGap,
            y: startY + row * yGap,
            z: 110 - row * 12,
          };
        });
      })();

      setNodes(
        layoutNodes
      );
      return;
    }

    setNodes(graphData.nodes);
  }, [dimensions.height, dimensions.width, focusedGraphData, forceLabels, graphData.nodes, selectedNode?.type, selectedNodeId]);

  useEffect(() => {
    const updateSize = () => {
      if (!svgRef.current) return;
      const { width, height } = svgRef.current.getBoundingClientRect();
      setDimensions({ width: Math.max(width, 640), height: Math.max(height, 520) });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (focusedGraphData || !graphData.nodes.length) return;

    const simulation = d3
      .forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id((d) => d.id).distance(140).strength(0.9))
      .force('charge', d3.forceManyBody().strength(-255))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide((d) => (d.type === 'company' ? 34 : 24)))
      .alphaDecay(0.05);

    simulation.on('tick', () => {
      setNodes([...graphData.nodes]);
    });

    return () => simulation.stop();
  }, [dimensions.width, dimensions.height, focusedGraphData, graphData.links, graphData.nodes]);

  useEffect(() => {
    if (!command) return;

    setView((current) => {
      if (command.type === 'zoomIn') {
        return { ...current, zoom: clamp(current.zoom + 0.18, 0.55, 2.6) };
      }

      if (command.type === 'zoomOut') {
        return { ...current, zoom: clamp(current.zoom - 0.18, 0.55, 2.6) };
      }

      if (command.type === 'reset') {
        return {
          yaw: -0.35,
          pitch: 0.22,
          zoom: 1,
          panX: 0,
          panY: 0,
          hoverX: 0,
          hoverY: 0,
        };
      }

      return current;
    });
  }, [command]);

  useEffect(() => {
    if (!selectedNode) return;

    if (forceLabels) {
      setView((current) => ({
        ...current,
        yaw: 0,
        pitch: 0,
        zoom: 1,
        panX: 0,
        panY: 0,
        hoverX: 0,
        hoverY: 0,
      }));
      return;
    }

    setView((current) => ({
      ...current,
      yaw: -0.08,
      pitch: 0.04,
      zoom: 1,
      panX: selectedNode.type === 'company' ? 35 : 10,
      panY: selectedNode.type === 'company' ? -30 : -18,
      hoverX: 0,
      hoverY: 0,
    }));
  }, [forceLabels, selectedNode]);

  const projected = useMemo(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const sinYaw = Math.sin(view.yaw);
    const cosYaw = Math.cos(view.yaw);
    const sinPitch = Math.sin(view.pitch);
    const cosPitch = Math.cos(view.pitch);
    const cameraDepth = 880;
    const hoverTiltX = forceLabels && focusedGraphData ? 0 : view.hoverX * 30;
    const hoverTiltY = forceLabels && focusedGraphData ? 0 : view.hoverY * 18;

    const nodeMap = new Map(
      nodes.map((node) => {
        const localX = node.x - centerX;
        const localY = node.y - centerY;
        const localZ = node.z ?? 0;

        const yawX = localX * cosYaw - localZ * sinYaw;
        const yawZ = localX * sinYaw + localZ * cosYaw;
        const pitchY = localY * cosPitch - yawZ * sinPitch;
        const pitchZ = localY * sinPitch + yawZ * cosPitch;

        const depth = cameraDepth - pitchZ;
        const perspective = clamp(cameraDepth / Math.max(depth, 120), 0.45, 4);
        const screenX = centerX + (yawX + view.panX + hoverTiltX) * perspective * view.zoom;
        const screenY = centerY + (pitchY + view.panY + hoverTiltY) * perspective * view.zoom;
        const isCompany = node.type === 'company';
        const radius = clamp((isCompany ? 18 : 12) * perspective * (0.8 + view.zoom * 0.25), 5, 34);

        return [
          node.id,
          {
            ...node,
            screenX,
            screenY,
            radius,
            depth: pitchZ,
            perspective,
            visible: depth > 80,
          },
        ];
      })
    );

    const projectedLinks = activeGraphData.links
      .map((link, index) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);

        if (!source || !target || !source.visible || !target.visible) return null;

        return {
          key: `link-${index}`,
          source,
          target,
          depth: (source.depth + target.depth) / 2,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.depth - b.depth);

    const projectedNodes = Array.from(nodeMap.values())
      .filter((node) => node.visible)
      .sort((a, b) => a.depth - b.depth);

    return { projectedLinks, projectedNodes };
  }, [activeGraphData.links, dimensions.height, dimensions.width, focusedGraphData, forceLabels, nodes, view]);

  const beginOrbitFromPointer = (pointerId, clientX, clientY, currentView, pointerType) => {
    dragStateRef.current.mode = 'orbit';
    dragStateRef.current.pointerType = pointerType;
    dragStateRef.current.primaryPointerId = pointerId;
    dragStateRef.current.startX = clientX;
    dragStateRef.current.startY = clientY;
    dragStateRef.current.startYaw = currentView.yaw;
    dragStateRef.current.startPitch = currentView.pitch;
  };

  const beginPinchFromPointers = (currentView) => {
    const pointers = Array.from(dragStateRef.current.pointers.values());
    if (pointers.length < 2) return;

    const [first, second] = pointers;
    const deltaX = second.clientX - first.clientX;
    const deltaY = second.clientY - first.clientY;

    dragStateRef.current.mode = 'pinch';
    dragStateRef.current.pointerType = 'touch';
    dragStateRef.current.primaryPointerId = null;
    dragStateRef.current.startDistance = Math.hypot(deltaX, deltaY);
    dragStateRef.current.startCenterX = (first.clientX + second.clientX) / 2;
    dragStateRef.current.startCenterY = (first.clientY + second.clientY) / 2;
    dragStateRef.current.startPanX = currentView.panX;
    dragStateRef.current.startPanY = currentView.panY;
    dragStateRef.current.startZoom = currentView.zoom;
  };

  const handlePointerDown = (event) => {
    if (!containerRef.current) return;

    containerRef.current.setPointerCapture(event.pointerId);

    if (event.pointerType === 'touch') {
      dragStateRef.current.pointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (dragStateRef.current.pointers.size === 1) {
        beginOrbitFromPointer(event.pointerId, event.clientX, event.clientY, view, 'touch');
        return;
      }

      if (dragStateRef.current.pointers.size >= 2) {
        beginPinchFromPointers(view);
      }

      return;
    }

    dragStateRef.current.pointers.clear();
    dragStateRef.current.mode = event.button === 2 || event.shiftKey ? 'pan' : 'orbit';
    dragStateRef.current.pointerType = event.pointerType;
    dragStateRef.current.primaryPointerId = event.pointerId;
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.startY = event.clientY;
    dragStateRef.current.startYaw = view.yaw;
    dragStateRef.current.startPitch = view.pitch;
    dragStateRef.current.startPanX = view.panX;
    dragStateRef.current.startPanY = view.panY;
  };

  const handlePointerMove = (event) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const isTouch = event.pointerType === 'touch';

    if (isTouch && dragStateRef.current.pointers.has(event.pointerId)) {
      dragStateRef.current.pointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }

    const hoverX = isTouch ? 0 : ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const hoverY = isTouch ? 0 : ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    setView((current) => {
      const next = {
        ...current,
        hoverX: clamp(hoverX, -1, 1),
        hoverY: clamp(hoverY, -1, 1),
      };

      if (dragStateRef.current.mode === 'pinch' && dragStateRef.current.pointers.size >= 2) {
        const [first, second] = Array.from(dragStateRef.current.pointers.values());
        const centerX = (first.clientX + second.clientX) / 2;
        const centerY = (first.clientY + second.clientY) / 2;
        const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
        const nextZoom = clamp(
          dragStateRef.current.startZoom * (distance / Math.max(dragStateRef.current.startDistance, 1)),
          0.55,
          2.6
        );

        next.zoom = nextZoom;
        next.panX = dragStateRef.current.startPanX + (centerX - dragStateRef.current.startCenterX) / dragStateRef.current.startZoom;
        next.panY = dragStateRef.current.startPanY + (centerY - dragStateRef.current.startCenterY) / dragStateRef.current.startZoom;
        return next;
      }

      if (dragStateRef.current.primaryPointerId !== event.pointerId) {
        return next;
      }

      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;

      if (dragStateRef.current.mode === 'pan') {
        next.panX = dragStateRef.current.startPanX + deltaX / current.zoom;
        next.panY = dragStateRef.current.startPanY + deltaY / current.zoom;
        return next;
      }

      next.yaw = dragStateRef.current.startYaw + deltaX * 0.0065;
      next.pitch = clamp(dragStateRef.current.startPitch + deltaY * 0.0045, -1.1, 1.1);
      return next;
    });
  };

  const resetPointer = (event) => {
    if (!containerRef.current) return;

    if (containerRef.current.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }

    if (event.pointerType === 'touch') {
      dragStateRef.current.pointers.delete(event.pointerId);

      if (dragStateRef.current.pointers.size >= 2) {
        beginPinchFromPointers(view);
        return;
      }

      if (dragStateRef.current.pointers.size === 1) {
        const [pointerId, pointer] = Array.from(dragStateRef.current.pointers.entries())[0];
        beginOrbitFromPointer(pointerId, pointer.clientX, pointer.clientY, view, 'touch');
        return;
      }
    }

    dragStateRef.current.mode = null;
    dragStateRef.current.pointerType = null;
    dragStateRef.current.primaryPointerId = null;
    dragStateRef.current.pointers.clear();

    setView((current) => ({
      ...current,
      hoverX: 0,
      hoverY: 0,
    }));
  };

  const handleWheel = (event) => {
    event.preventDefault();

    setView((current) => ({
      ...current,
      zoom: clamp(current.zoom - event.deltaY * 0.0012, 0.55, 2.6),
    }));
  };

  const labelColor = '#e2e8f0';
  const normalizedFilter = filterTerm.toLowerCase();

  return (
    <div
      ref={containerRef}
      className="graph-panel graph-panel-3d"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={resetPointer}
      onPointerCancel={resetPointer}
      onPointerLeave={resetPointer}
      onContextMenu={(event) => event.preventDefault()}
      onWheel={handleWheel}
    >
      <svg ref={svgRef} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="canvasGradient" cx="50%" cy="20%" r="90%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.32" />
            <stop offset="35%" stopColor="#0f172a" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="beamGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#canvasGradient)" />
        <ellipse
          cx={dimensions.width / 2}
          cy={dimensions.height * 0.9}
          rx={dimensions.width * 0.36}
          ry={dimensions.height * 0.12}
          fill="rgba(14, 116, 144, 0.18)"
        />

        {Array.from({ length: 28 }).map((_, index) => (
          <circle
            key={`star-${index}`}
            cx={(dimensions.width / 28) * index + ((index * 37) % 21)}
            cy={60 + ((index * 53) % Math.max(dimensions.height - 120, 1))}
            r={(index % 3) + 1}
            fill="rgba(191, 219, 254, 0.22)"
          />
        ))}

        <g>
          {projected.projectedLinks.map((link) => (
            <line
              key={link.key}
              x1={link.source.screenX}
              y1={link.source.screenY}
              x2={link.target.screenX}
              y2={link.target.screenY}
              stroke="url(#beamGradient)"
              strokeWidth={clamp(link.source.perspective * 1.4, 0.75, 2.8)}
              opacity={clamp(0.2 + (link.source.perspective + link.target.perspective) * 0.18, 0.16, 0.7)}
            />
          ))}
        </g>

        <g>
          {projected.projectedNodes.map((node) => {
            const isCompany = node.type === 'company';
            const fill = isCompany ? colorHex(compColor[node.compType] || 0x64748b) : colorHex(personColor);
            const stroke = isCompany ? '#dbeafe' : '#fecdd3';
            const active = hoveredId === node.id || selectedNodeId === node.id;
            const matchesFilter = focusedGraphData || !normalizedFilter || node.name.toLowerCase().includes(normalizedFilter);
            const nodeOpacity = matchesFilter ? 0.95 : 0.2;
            const showLabel = Boolean(forceLabels || focusedGraphData || active);

            return (
              <g key={node.id}>
                <circle
                  cx={node.screenX}
                  cy={node.screenY}
                  r={node.radius * 1.7}
                  fill={fill}
                  opacity={matchesFilter ? 0.08 : 0.03}
                />
                <circle
                  cx={node.screenX}
                  cy={node.screenY}
                  r={node.radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={active ? 2.8 : 1.3}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onNodeClick(node)}
                  fillOpacity={nodeOpacity}
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, filter 0.15s ease',
                    filter: active
                      ? 'drop-shadow(0 0 22px rgba(56,189,248,0.65))'
                      : 'drop-shadow(0 10px 18px rgba(15,23,42,0.45))',
                  }}
                />
                {showLabel && (
                  <text
                    x={node.screenX}
                    y={node.screenY - node.radius - 12}
                    textAnchor="middle"
                    fontSize={clamp(node.radius * 0.62, 10, 13)}
                    fill={labelColor}
                    fontWeight="700"
                    pointerEvents="none"
                    opacity={matchesFilter ? clamp(node.perspective * 0.7, 0.5, 1) : 0.24}
                  >
                    {shortLabel(node.name, forceLabels || focusedGraphData ? 34 : 28)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="graph-help">
        <button type="button" className="graph-help-button" aria-label="Network map instructions">
          ?
        </button>
        <div className="graph-help-tooltip">
          <span>{selectedNode ? 'Only direct links are shown' : 'Showing full network'}</span>
          <span>Drag or swipe to orbit</span>
          <span>Pinch or wheel to zoom</span>
        </div>
      </div>
    </div>
  );
};

export default Graph2D;
