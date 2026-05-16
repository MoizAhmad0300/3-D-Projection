# React App 2D Network Setup Guide

## Purpose
This update converts the previous 3D network view into a cleaner, professional 2D layout. The goal is to make the interface more readable, visually neutral, and easier to extend over time.

## What changed
- Replaced the 3D renderer with a 2D SVG force-directed graph.
- Updated the UI theme to a neutral light palette for a normal, professional look.
- Cleaned up the info panel and tree navigation to match the new 2D experience.
- Made node rendering more scalable and safer by using React state and D3 for layout.

## Key files
- `src/App.jsx`
  - Updated the graph component to `Graph2D`.
  - Keeps the same data-driven selection pattern for node details.

- `src/components/Graph2D.jsx`
  - New component for the 2D network graph.
  - Uses `d3.forceSimulation` to position nodes in two dimensions.
  - Renders relationships in SVG using circles and lines.
  - Supports hover and click behavior for interactive node selection.

- `src/components/InfoPanel.jsx`
  - Updated content to describe the 2D view.
  - Replaced unsafe markup with regular React lists.

- `src/components/TreeView.jsx`
  - Refined the tree panel text to remove 3D-specific instructions.
  - Kept the same node selection behavior for the left-side hierarchy.

- `src/index.css`
  - Applied a neutral background and card-style panels.
  - Restyled the info panel and tree panel for a professional appearance.

## Why this approach
- **2D is more readable** for network diagrams, especially for company/person relationships.
- **SVG and D3** are a strong combination for scalable graph visualization.
- **React component structure** keeps the graph, info panel, and tree view separate and maintainable.
- **Neutral theme** avoids extremes in brightness or darkness so the app feels balanced for real-world use.

## Running the project
1. Open a terminal in `react-app`
2. Install dependencies if needed:
   ```powershell
   npm install
   ```
3. Start the development server:
   ```powershell
   npm run dev
   ```
4. Open the local URL shown by Vite, usually `http://localhost:5173`

## Notes
- The 2D graph uses values defined in `src/data.js` and maps company types to consistent colors.
- If you want to further optimize the experience, the `Graph2D` component is a good place to add grouping, search, or filtering features.
- This setup is ready for new data, because the graph rendering uses the same shared data model and a force-directed layout.
