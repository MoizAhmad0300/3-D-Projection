# Folder Structure Management Guide

## Overview
The folder system is now integrated into the entity details panel. When you select a company entity, a **"View Documents"** button appears (if the entity has folder configuration). Clicking it opens a modal with a hierarchical folder structure.

## Features
✓ **Folder Modal** - Clean, modern modal interface with folder tree view  
✓ **Expandable Folders** - Click to expand/collapse each folder  
✓ **Icons** - Each folder has a visual icon  
✓ **Consistent & Scalable** - Easy to add new entities and customize folder structures  
✓ **Theme Support** - Works with both dark and light themes  

## How to Add More Entities and Folders

### 1. Edit `src/data.js`
Locate the `entityFolders` object and add a new entity:

```javascript
export const entityFolders = {
  "PARAGON GLOBAL SERVICES PVT LTD": {
    name: "PARAGON GLOBAL SERVICES PVT LTD",
    folders: [
      { name: "Appeal", icon: "📋" },
      { name: "Chamber", icon: "🏛️" },
      { name: "FBR Income Tax", icon: "💰" },
      { name: "FBR Sales Tax", icon: "📊" },
      { name: "SECP", icon: "🏢" },
      { name: "IPO", icon: "📈" },
      { name: "Other Documents", icon: "📁" }
    ]
  },
  
  // ADD YOUR NEW ENTITY HERE:
  "YOUR COMPANY NAME": {
    name: "YOUR COMPANY NAME",
    folders: [
      { name: "Folder 1", icon: "📋" },
      { name: "Folder 2", icon: "📊" },
      { name: "Folder 3", icon: "📁" }
    ]
  }
};
```

### 2. Available Folder Icons
You can use any emoji as a folder icon. Here are some suggestions:

- **Documents**: 📋 📄 📃 📑 🗂️
- **Finance**: 💰 💵 💸 📊 📈 📉
- **Legal**: 🏛️ ⚖️ 📜 🔏
- **Government**: 🏢 🏦 🏛️ 🎖️
- **General**: 📁 📂 🗃️

### 3. Adding More Folders to Existing Entities
Simply add more items to the `folders` array:

```javascript
"PARAGON GLOBAL SERVICES PVT LTD": {
  name: "PARAGON GLOBAL SERVICES PVT LTD",
  folders: [
    { name: "Appeal", icon: "📋" },
    { name: "Chamber", icon: "🏛️" },
    { name: "FBR Income Tax", icon: "💰" },
    { name: "FBR Sales Tax", icon: "📊" },
    { name: "SECP", icon: "🏢" },
    { name: "IPO", icon: "📈" },
    { name: "Other Documents", icon: "📁" },
    { name: "NEW FOLDER", icon: "🆕" }  // New folder added
  ]
}
```

## How It Works

1. **User selects an entity** (company) on the network map
2. **Entity Details panel opens** showing directors/partners
3. **"View Documents" button appears** (only if entity has folder configuration)
4. **Clicking the button opens a modal** with the folder tree
5. **Users can expand/collapse folders** to explore the structure

## Component Files

- **`src/data.js`** - Contains `entityFolders` configuration and `getEntityFolders()` helper
- **`src/components/FolderView.jsx`** - Modal component displaying folder structure
- **`src/components/InfoPanel.jsx`** - Updated to include folder button and modal integration
- **`src/index.css`** - Contains all styling for folder view (`.folder-*` classes)

## Customization

### Styling
All folder view styles use CSS variables for theme consistency:
- `--primary` - Primary accent color
- `--background-panel` - Panel background
- `--text` - Text color
- `--border` - Border color

Modify these in `:root` section of `src/index.css` to change the overall look.

### Behavior
To modify folder behavior (e.g., add sub-folders), edit `src/components/FolderView.jsx`:

```javascript
// Example: Add sub-folders capability
const [expandedFolders, setExpandedFolders] = useState(new Set());

// Add nested folder support to data structure:
{ name: "Appeal", icon: "📋", subfolders: ["2024", "2023"] }
```

## Entity Data Mapping

The system uses entity names as keys. Make sure the entity name matches exactly:
- Company name must match exactly as in `companiesData` array
- Case-sensitive
- Example: `"PARAGON GLOBAL SERVICES PVT LTD"` (not abbreviated)

## Future Enhancements

Potential features to add:
- File upload/download in folders
- Folder-level permissions
- Document search within folders
- Folder sharing capabilities
- Dynamic folder creation UI
- Integration with cloud storage
