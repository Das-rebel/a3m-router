# Improved Prompts for A3M Router Product Video
# Based on vault learnings from Nano Banana + Veo 3 best practices

## Key Patterns from Vault

### Nano Banana (Image) - Reality-First Prompt Structure
```
[Subject] in [Setting], [Lighting], [Style/Medium], [Technical specs]
```

### Veo 3 (Video) - JSON Structure
```json
{
  "shot": {
    "composition": "Wide shot of...",
    "lens": "35mm wide-angle",
    "frame_rate": "24fps",
    "camera_movement": "slow dolly forward",
    "film_grain": "subtle grain"
  }
}
```

### Style Extraction Prompt
```
"extract this visual style as JSON structured data: colors, typography, composition, camera angle, lighting mood"
```

---

## Frame 1: AI Data Center (Hero Shot)
**Image prompt:**
> Photorealistic shot of a modern AI data center at night, rows of glowing server racks with blue and green LED indicators, hum of machinery, volumetric fog, wide-angle composition, dramatic lighting from below, photorealistic,8K detail, professional product photography

**Video prompt (JSON):**
```json
{
  "shot": {
    "composition": "Slow push-in through rows of server racks, blue and green LED lights reflecting off glass floors",
    "lens": "24mm wide-angle lens",
    "frame_rate": "24fps",
    "camera_movement": "Slow forward dolly, subtle drift left",
    "film_grain": "Cinematic grain, slight vignette"
  }
}
```

---

## Frame 2: Cost Comparison
**Image prompt:**
> A split-screen product photography composition showing two laptop screens side by side. Left screen: large red bar chart labeled "GPT-4: $0.03/query" in bold red text. Right screen: tiny green bar chart labeled "A3M Router: $0.0004/query" in bold green text. Dark room, desk lamp lighting from left, Apple-style clean aesthetic, professional infographic style, photorealistic

**Video prompt (JSON):**
```json
{
  "shot": {
    "composition": "Close-up on laptop screens, two bar charts animating - red bar shrinking, green bar growing",
    "lens": "50mm portrait lens",
    "frame_rate": "30fps",
    "camera_movement": "Slow zoom in on the comparison, subtle parallax",
    "film_grain": "Clean digital, slight bloom on bright elements"
  }
}
```

---

## Frame 3: Parallel Execution
**Image prompt:**
> Dark terminal window on a MacBook Pro, showing a technical diagram: a single input arrow branching into 5 simultaneous output arrows leading to provider boxes (Groq, Cerebras, DeepSeek, Mistral, OpenAI), each with green checkmarks and latency indicators, holographic-style overlay effect, cyberpunk aesthetic, neon cyan and green accents on dark background, professional technical illustration

**Video prompt (JSON):**
```json
{
  "shot": {
    "composition": "Terminal window, 5 arrows animating outward simultaneously from center input, each reaching provider boxes at different speeds",
    "lens": "35mm lens",
    "frame_rate": "24fps",
    "camera_movement": "Slow orbit around the diagram, slight tilt up",
    "film_grain": "Subtle CRT scanline effect, digital noise"
  }
}
```

---

## Frame 4: 40 Providers
**Image prompt:**
> A sleek terminal window on a dark desk, displaying a provider status table with columns: Provider, Status, Cost/1K tokens, Latency. All rows show green checkmarks. Title text: "40 Providers — All Online" in bold white. Subtle green glow on checkmarks, dark theme, Apple MacBook on desk, professional product shot, warm desk lamp from right

**Video prompt (JSON):**
```json
{
  "shot": {
    "composition": "Camera slowly pans down the provider table, rows lighting up green one by one",
    "lens": "50mm portrait lens",
    "frame_rate": "24fps",
    "camera_movement": "Slow vertical pan, subtle follow focus",
    "film_grain": "Cinematic grain, slight lens flare on text"
  }
}
```

---

## Frame 5: End Card
**Image prompt:**
> Minimalist dark product card floating in space, centered text "A3M Router" in large bold white sans-serif font with subtle blue glow, below: "#1 on RouterArena · 213× cheaper ·40 providers" in medium gray text, terminal-style code box at bottom: "npm install adaptive-memory-multi-model-router" in green monospace, GitHub and npm logos side by side at very bottom, Apple product presentation style, dramatic spotlight from above, clean dark void background

**Video prompt (JSON):**
```json
{
  "shot": {
    "composition": "Product card centered, text elements fading in sequentially, subtle floating animation",
    "lens": "85mm portrait lens",
    "frame_rate": "24fps",
    "camera_movement": "Very slow push in, subtle breathing motion",
    "film_grain": "Clean digital, subtle light rays from above"
  }
}
```

---

## General Tips from Vault

1. **Be specific about lighting**: "desk lamp from left", "volumetric fog", "dramatic spotlight from above"
2. **Include technical specs**: lens type, frame rate, resolution
3. **Use professional photography terms**: bokeh, depth of field, wide-angle, portrait lens
4. **Reference real-world media**: "Apple product presentation", "Bloomberg terminal", "cyberpunk aesthetic"
5. **For animations**: specify camera movement direction and speed
6. **For comparisons**: use visual metaphors (bars, split-screen, before/after)
