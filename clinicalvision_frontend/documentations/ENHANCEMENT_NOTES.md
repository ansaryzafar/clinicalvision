# Medical Viewer Enhancement Plan

## ✅ Current Features (Working)
- Pan tool (click and drag)
- Zoom (buttons + mouse wheel)
- Rotate (90° increments)
- Window/Level adjustment
- Reset view
- Attention map overlay
- Bounding boxes with labels
- Fullscreen mode
- Download PNG

## 🚀 Proposed Enhancements

### 1. **Window/Level Presets** (High Priority)
Add preset buttons for common mammography views:
- Standard (W: 255, C: 128)
- Soft Tissue (W: 350, C: 50)
- Calcification (W: 150, C: 200)
- High Contrast (W: 100, C: 128)

**Implementation:** Add ButtonGroup with preset buttons above viewer

### 2. **Keyboard Shortcuts** (High Priority)
- `R` - Reset view
- `F` - Fullscreen
- `P` - Pan tool
- `W` - Window/Level tool
- `O` - Toggle overlay
- `+/-` - Zoom in/out
- `ESC` - Clear measurements

**Implementation:** Add useEffect with keydown listener + info panel

### 3. **Pixel Probe** (Medium Priority)
Display pixel value and coordinates on hover:
- Show X, Y coordinates
- Show grayscale pixel value
- Display in corner or tooltip

**Implementation:** 
- Add mousemove handler to get canvas coordinates
- Sample pixel from image data
- Display in info panel

### 4. **Measurement Tool** (Medium Priority)
Distance measurement between two points:
- Click two points to measure
- Display distance in pixels/mm
- Draw line with distance label
- ESC to clear

**Implementation:**
- Add 'Measure' tool state
- Store measurement points array
- Calculate Euclidean distance
- Render on canvas

### 5. **Image Comparison** (Low Priority)
Side-by-side view for CC and MLO:
- Split screen mode
- Synchronized pan/zoom
- Link window/level

**Implementation:** Requires refactor to support dual canvas

### 6. **Histogram Display** (Low Priority)
Show pixel intensity distribution:
- Real-time histogram
- Window/level bounds overlay
- Statistics (mean, std)

**Implementation:** Calculate histogram from ImageData, render with Chart.js

### 7. **View Presets Save/Load** (Low Priority)
Save custom window/level settings:
- Local storage persistence
- Named presets
- Quick recall

**Implementation:** localStorage API + preset manager

## 🎯 Recommended Implementation Order

1. **Window/Level Presets** - Most requested by radiologists
2. **Keyboard Shortcuts** - Improves workflow efficiency
3. **Pixel Probe** - Useful for verification
4. **Measurement Tool** - Clinical utility

## 📝 Code Locations

- Main viewer: `src/components/viewer/MedicalViewer.tsx`
- Add presets UI: After line 440 (toolbar section)
- Add keyboard handler: After line 145 (useEffect section)
- Add probe/measure: In renderCanvas() function

## 🔧 Implementation Strategy

**Option A: Incremental Enhancement** (Recommended)
- Add features one at a time
- Test each thoroughly
- Keep current viewer working

**Option B: Create Enhanced Version**
- Create `MedicalViewerPro.tsx`
- Add all features at once
- Switch when stable

**I recommend Option A** - safer and allows user testing at each step.

## 💡 Which enhancements would you like me to implement first?

Please choose from:
1. Window/Level Presets
2. Keyboard Shortcuts  
3. Pixel Probe
4. Measurement Tool
5. All of the above
6. Other specific feature
