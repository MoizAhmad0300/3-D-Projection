import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { graphNodes, links, compColor, personColor } from '../data.js';

const colorHex = (value) => `#${value.toString(16).padStart(6, '0')}`;
const shortLabel = (text, max = 26) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const Graph2D = ({ onNodeClick }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const dragStateRef = useRef({
    pointerId: null,
    mode: null,
    startX: 0,
    startY: 0,
    startYaw: 0,
    startPitch: 0,
    startPanX: 0,
    startPanY: 0,
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
      nodes: graphNodes.map((node, index) => {
        const angle = (index / graphNodes.length) * Math.PI * 2;
        const depthBand = node.type === 'company' ? 150 : -110;

        return {
          ...node,
          x: Math.random() * 1200,
          y: Math.random() * 760,
          z: depthBand + Math.sin(angle * 2.7) * 90 + Math.cos(angle * 1.8) * 50,
        };
      }),
      links: links.map((link) => ({ ...link })),
    }),
    []
  );

  useEffect(() => {
    setNodes(graphData.nodes);
  }, [graphData.nodes]);

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
    if (!graphData.nodes.length) return;

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
  }, [dimensions.width, dimensions.height, graphData.links, graphData.nodes]);

  const projected = useMemo(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const sinYaw = Math.sin(view.yaw);
    const cosYaw = Math.cos(view.yaw);
    const sinPitch = Math.sin(view.pitch);
    const cosPitch = Math.cos(view.pitch);
    const cameraDepth = 880;
    const hoverTiltX = view.hoverX * 30;
    const hoverTiltY = view.hoverY * 18;

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

    const projectedLinks = graphData.links
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
  }, [dimensions.height, dimensions.width, graphData.links, nodes, view]);

  const handlePointerDown = (event) => {
    if (!containerRef.current) return;

    const mode = event.button === 2 || event.shiftKey ? 'pan' : 'orbit';
    dragStateRef.current = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startYaw: view.yaw,
      startPitch: view.pitch,
      startPanX: view.panX,
      startPanY: view.panY,
    };

    containerRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const hoverX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const hoverY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    setView((current) => {
      const next = {
        ...current,
        hoverX: clamp(hoverX, -1, 1),
        hoverY: clamp(hoverY, -1, 1),
      };

      if (dragStateRef.current.pointerId !== event.pointerId) {
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

    if (dragStateRef.current.pointerId === event.pointerId) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current.pointerId = null;
    dragStateRef.current.mode = null;

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

  return (
    <div
      ref={containerRef}
      className="graph-panel graph-panel-3d"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={resetPointer}
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
            const active = hoveredId === node.id;

            return (
              <g key={node.id}>
                <circle
                  cx={node.screenX}
                  cy={node.screenY}
                  r={node.radius * 1.7}
                  fill={fill}
                  opacity={0.08}
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
                  fillOpacity="0.95"
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, filter 0.15s ease',
                    filter: active
                      ? 'drop-shadow(0 0 22px rgba(56,189,248,0.65))'
                      : 'drop-shadow(0 10px 18px rgba(15,23,42,0.45))',
                  }}
                />
                {(isCompany || active) && (
                  <text
                    x={node.screenX}
                    y={node.screenY - node.radius - 12}
                    textAnchor="middle"
                    fontSize={clamp(node.radius * 0.72, 11, 15)}
                    fill={labelColor}
                    fontWeight="700"
                    pointerEvents="none"
                    opacity={clamp(node.perspective * 0.7, 0.5, 1)}
                  >
                    {shortLabel(node.name, 28)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="graph-hud">
        <div className="graph-legend">
          <div className="graph-legend-row">
            <span className="graph-legend-dot graph-legend-dot-person" />
            <span>People</span>
          </div>
          <div className="graph-legend-row">
            <span className="graph-legend-dot graph-legend-dot-company" />
            <span>Companies</span>
          </div>
        </div>
        <div className="graph-controls">
          <span>Drag to orbit</span>
          <span>Shift + drag to pan</span>
          <span>Wheel to zoom</span>
        </div>
      </div>
    </div>
  );
};

export default Graph2D;
