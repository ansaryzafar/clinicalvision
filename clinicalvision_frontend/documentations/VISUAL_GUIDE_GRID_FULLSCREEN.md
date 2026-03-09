# 🎨 Visual Guide: Grid & Fullscreen Features

## Grid Overlay Visualization

```
┌────────────────────────────────────────────────────┐
│                   MAMMOGRAM IMAGE                  │
│                                                    │
│     │     │     │     │     │     │     │     │   │
│  ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─  │
│     │     │     │     │     │     │     │     │   │
│     │  0,10    │     │     │     │     │     │   │
│     │     │     │     │     │     │     │     │   │
│  ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─  │
│     │     │     │     │     │     │     │     │   │
│  10,10   │     │     │ 🔴  │     │     │     │   │  🔴 = Lesion
│     │     │     │     │     │     │     │     │   │
│  ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─ ─ ─┼─  │
│     │     │     │     │     │     │     │     │   │
│     │     │ 20,20    │     │     │     │     │   │
│     │     │     │     │     │     │     │     │   │
└────────────────────────────────────────────────────┘
  └─ 10mm grid with coordinate labels
```

## Fullscreen Mode Layout

### Normal Mode:
```
┌─────────────────────────────────────────────────────┐
│ [Header: Medical Image Viewer]                     │
├─────────────────────────────────────────────────────┤
│ [Toolbar: Tools | Presets | Controls | Actions]   │
│ [Sliders: Opacity, Grid Spacing, Calibration]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│              CANVAS (600px height)                 │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [Instructions & Status Bar]                        │
└─────────────────────────────────────────────────────┘
```

### Fullscreen Mode:
```
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐   │  ← Pixel Probe
│  │ Pixel Probe                                 │   │     (top-right)
│  │ X: 234px, Y: 156px                         │   │
│  │ Value: 187                                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌──────────────┐                                   │
│ │ Measurement  │                                   │  ← Measurement
│ │ 2 measures   │                                   │     Status
│ │ Press ESC    │                                   │     (top-left)
│ └──────────────┘                                   │
│                                                     │
│                                                     │
│         FULL SCREEN CANVAS (100vh)                 │
│                                                     │
│                                                     │
│                                                     │
│     ┌────────────────────────────────────────┐    │
│     │ [P][W][M] | [-]75%[+] | [↻][Reset] |  │    │  ← Floating
│     │ [👁][#][⊕] | [Exit Fullscreen]        │    │     Toolbar
│     └────────────────────────────────────────┘    │     (bottom)
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Toolbar Components

### Normal Mode Toolbar:
```
┌────────────────────────────────────────────────────────────────┐
│  Tools          Presets              Zoom    Actions           │
│ ┌─────────┐   ┌─────────────────┐  ┌─────┐  ┌──────────────┐ │
│ │ P W M   │   │ Std Soft Cal HC │  │ - + │  │ 👁 # ⊕ ? ⛶ ⬇ │ │
│ └─────────┘   └─────────────────┘  └─────┘  └──────────────┘ │
└────────────────────────────────────────────────────────────────┘
         │              │                │            │
         │              │                │            └─ Overlay/Grid/Probe/Help/Full/Down
         │              │                └─ Zoom controls
         │              └─ Window/Level presets  
         └─ Pan/Window/Measure tools
```

### Fullscreen Floating Toolbar:
```
┌──────────────────────────────────────────────────────┐
│ ┌──────────┐│┌──────────┐│┌──────────────┐│┌──────┐│
│ │ P │ W │ M │││ - 75% + │││ ↻│Reset│👁│#│⊕│││ Exit ││
│ └──────────┘│└──────────┘│└──────────────┘│└──────┘│
│    Tools    │   Zoom    │    Quick       │  Exit   │
└──────────────────────────────────────────────────────┘
```

## Grid Configuration UI

When grid is enabled, sliders appear:

```
┌────────────────────────────────────────────────┐
│ Overlay Opacity:  [▓▓▓▓▓▓░░░░] 60%           │
├────────────────────────────────────────────────┤
│ Grid Spacing:     [▓▓░░░░░░░░] 10mm          │
│ Calibration:      [▓▓▓▓▓░░░░░] 10 px/mm      │
└────────────────────────────────────────────────┘
```

## Measurement Display

### Without Grid:
```
    ●────────────● 
      125.5px
```

### With Grid Calibration:
```
    ●────────────● 
  125.5px (12.6mm)
```

## Visual Indicators

### Tool States:
- **Active Tool:** Blue highlighted button
- **Pan:** Grab cursor (hand icon)
- **Window/Level:** Crosshair cursor
- **Measure:** Crosshair cursor

### Overlay States:
- **Grid Enabled:** Green grid button, visible grid lines
- **Grid Disabled:** Gray grid button, no lines
- **Pixel Probe On:** Blue probe button, floating info panel
- **Pixel Probe Off:** Gray probe button, no panel

### Measurement States:
- **No measurements:** Clean canvas
- **First point:** Yellow dot, waiting for second point
- **Complete:** Green line with distance label
- **Multiple:** Multiple green lines with labels

## Color Scheme

```
Grid Lines:         #00ff00 (Green, 50% opacity)
Grid Labels:        #00ff00 (Green, 70% opacity)
Measurements:       #00ff00 (Green, solid)
Pending Point:      #ffff00 (Yellow)
Bounding Boxes:     #ff0000 (Red) / #ff6b00 (Orange)
Attention Map:      Red-Yellow gradient
Fullscreen Toolbar: rgba(0,0,0,0.8) with white icons
Active Controls:    Theme colors (blue/green)
```

## Interaction Patterns

### Grid + Pan:
```
1. Enable grid
2. Pan image → Grid moves with image
3. Grid maintains alignment with canvas
```

### Grid + Zoom:
```
1. Enable grid at 10mm spacing
2. Zoom in 2x → Grid lines appear 2x farther apart
3. Spacing scales correctly with zoom
```

### Grid + Measure:
```
1. Enable grid (visual reference)
2. Switch to Measure tool
3. Click points → Line drawn over grid
4. Distance shown in px and mm
```

### Fullscreen Workflow:
```
1. Press F → Enter fullscreen
2. Floating toolbar appears
3. Click tool → Tool activates
4. Press keyboard shortcut → Tool switches
5. Press F or Exit → Return to normal
```

## UI States

### Loading State:
```
┌────────────────────────────┐
│                            │
│    No Image Loaded         │
│                            │
│  Upload a mammogram to     │
│    begin analysis          │
│                            │
└────────────────────────────┘
```

### With Grid + Measurements + Probe:
```
┌─────────────────────────────────────┐
│ [Probe: X:234 Y:156 Val:187]       │ ← Top-right
│                                     │
│[Measures]      │     │     │       │ ← Top-left
│ 2 active       │     │     │       │
│                ●─────●     │       │ ← Measurement
│                │ 45.2px    │       │
│  ─ ─ ─ ─ ─ ─ ─│─ ─ ─(5.3mm)─ ─   │
│                │     │     │       │
│                │     │     │       │ ← Grid overlay
│  ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─│─ ─   │
│                │     │     │       │
│         [Floating Toolbar]         │ ← Bottom (fullscreen)
└─────────────────────────────────────┘
```

## Keyboard Shortcuts Quick Reference

```
┌───────────────────────────────────────────┐
│  TOOLS          VIEW          OVERLAY     │
│  ─────          ────          ───────     │
│  P - Pan        + - Zoom In   O - Overlay │
│  W - Window     - - Zoom Out  I - Probe   │
│  M - Measure    R - Reset     G - Grid    │
│                 F - Full      ESC - Clear │
│                               ? - Help    │
└───────────────────────────────────────────┘
```

## Pro Tip Callouts

```
💡 TIP: Calibrate grid once, then all measurements are accurate!

💡 TIP: Use grid + measurements together for spatial context

💡 TIP: Fullscreen + keyboard shortcuts = fastest workflow

💡 TIP: Grid color chosen for medical imaging visibility

💡 TIP: All tools work identically in fullscreen mode
```

This visual guide complements the technical documentation! 🎨
