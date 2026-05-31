#!/usr/bin/env python3
"""
A3M Router — 3Blue1Brown Style Explainer Video Generator

Creates animated frames showing:
1. The problem: expensive AI routing
2. The solution: intelligent routing
3. How it works: 12 signals
4. Results: 76.43 score, 213x cheaper

Usage:
    python3 demo/3blue1brown_video.py
"""

import subprocess
import json
import sys
import math
import os

# Check dependencies
def check_deps():
    try:
        import matplotlib
        import numpy
        print("✅ matplotlib, numpy available")
        return True
    except ImportError as e:
        print(f"❌ Missing: {e}")
        print("Install: pip install matplotlib numpy pillow")
        return False

def run_command(cmd, cwd=None):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
    return result.returncode == 0, result.stdout, result.stderr

# Frame definitions - each scene
SCENES = [
    {
        "id": 1,
        "title": "The AI Cost Problem",
        "content": "Every AI query goes to GPT-4\n$10.02 per 1,000 queries",
        "visual": "gpt4_cost_visual",
        "duration": 3.0
    },
    {
        "id": 2,
        "title": "The Solution",
        "content": "Route queries intelligently\nto the cheapest capable model",
        "visual": "routing_diagram",
        "duration": 3.0
    },
    {
        "id": 3,
        "title": "How A3M Routes",
        "content": "12 signals → instant decision\n<1ms, no GPU needed",
        "visual": "signals_animation",
        "duration": 4.0
    },
    {
        "id": 4,
        "title": "The Result",
        "content": "#1 on RouterArena\n76.43 accuracy at $0.047/1K",
        "visual": "benchmark_reveal",
        "duration": 3.0
    },
    {
        "id": 5,
        "title": "213x Cheaper",
        "content": "vs GPT-5: $10.02 → $0.047\nSame quality, 1/213th the cost",
        "visual": "cost_comparison",
        "duration": 3.0
    }
]

def generate_frame_matplotlib(scene_num, frame_num, total_frames, output_path):
    """Generate a single frame using matplotlib"""
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches
    import numpy as np
    
    # 3Blue1Brown color scheme
    bg_color = '#1a1a2e'
    text_color = '#ffffff'
    accent1 = '#00a8ff'  # Blue
    accent2 = '#ff6b6b'  # Red
    accent3 = '#4ecdc4'  # Teal
    accent4 = '#ffe66d'  # Yellow
    
    fig, ax = plt.subplots(figsize=(16, 9), facecolor=bg_color)
    ax.set_facecolor(bg_color)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9)
    ax.axis('off')
    
    if scene_num == 1:
        # Scene 1: GPT-4 cost visualization
        # Big "$10.02" in center
        ax.text(8, 5.5, '$10.02', fontsize=120, color=accent2, 
                ha='center', va='center', fontweight='bold', family='monospace')
        ax.text(8, 3.5, 'per 1,000 queries', fontsize=36, color=text_color,
                ha='center', va='center')
        ax.text(8, 1.5, 'GPT-4o', fontsize=28, color=accent1,
                ha='center', va='center', style='italic')
        
        # Animated circles representing money
        progress = frame_num / total_frames
        for i in range(int(progress * 20)):
            x = 2 + (i % 5) * 3
            y = 7.5 - (i // 5) * 0.8
            circle = patches.Circle((x, y), 0.3, color=accent2, alpha=0.6)
            ax.add_patch(circle)
            
    elif scene_num == 2:
        # Scene 2: Routing diagram
        ax.text(8, 7.5, 'A3M Router', fontsize=48, color=accent1,
                ha='center', va='center', fontweight='bold')
        
        # Query box
        rect = patches.FancyBboxPatch((1, 3.5), 3, 2, boxstyle="round,pad=0.1",
                                       facecolor=accent3, edgecolor='white', linewidth=2)
        ax.add_patch(rect)
        ax.text(2.5, 4.5, 'Query', fontsize=24, color=bg_color,
                ha='center', va='center', fontweight='bold')
        
        # Arrow
        ax.annotate('', xy=(5.5, 4.5), xytext=(4, 4.5),
                    arrowprops=dict(arrowstyle='->', color=accent1, lw=3))
        
        # Router box
        rect = patches.FancyBboxPatch((5.5, 3), 4, 3, boxstyle="round,pad=0.1",
                                       facecolor=accent1, edgecolor='white', linewidth=3)
        ax.add_patch(rect)
        ax.text(7.5, 5, 'A3M', fontsize=28, color=text_color,
                ha='center', va='center', fontweight='bold')
        ax.text(7.5, 4, '12 signals', fontsize=18, color='white',
                ha='center', va='center')
        ax.text(7.5, 3.3, '<1ms routing', fontsize=14, color='white',
                ha='center', va='center')
        
        # Arrows to providers
        providers = [('Groq\nFree', 12, 6.5, accent3),
                    ('GPT-4o\nPremium', 12, 4.5, accent2),
                    ('Gemini\nMid', 12, 2.5, accent4)]
        
        progress = frame_num / total_frames
        for i, (name, x, y, color) in enumerate(providers):
            if progress > (i * 0.3):
                ax.annotate('', xy=(x, y), xytext=(9.5, 4.5),
                            arrowprops=dict(arrowstyle='->', color=color, lw=2))
                rect = patches.FancyBboxPatch((x-0.8, y-0.5), 1.6, 1,
                                               boxstyle="round,pad=0.05",
                                               facecolor=color, edgecolor='white', 
                                               linewidth=1, alpha=min(1, (progress - i*0.3)*3))
                ax.add_patch(rect)
                ax.text(x, y, name, fontsize=12, color=bg_color,
                        ha='center', va='center', fontweight='bold', alpha=min(1, (progress - i*0.3)*3))
                
    elif scene_num == 3:
        # Scene 3: 12 signals animation
        ax.text(8, 8, '12 Keyword Signals', fontsize=44, color=accent1,
                ha='center', va='center', fontweight='bold')
        ax.text(8, 7, 'Multi-dimensional query analysis', fontsize=24, color=text_color,
                ha='center', va='center', alpha=0.7)
        
        # Grid of signals
        signals = ['coding', 'math', 'creative', 'factual', 
                   'simple', 'complex', 'debug', 'explain',
                   'short', 'long', 'structured', 'open']
        
        progress = frame_num / total_frames
        cols = 4
        for idx, sig in enumerate(signals):
            row = idx // cols
            col = idx % cols
            x = 3 + col * 2.5
            y = 5.5 - row * 1.8
            
            alpha = min(1, max(0, (progress - idx * 0.08) * 3))
            if alpha > 0:
                color = [accent1, accent3, accent4, accent2][idx % 4]
                circle = patches.Circle((x, y), 0.5, color=color, alpha=alpha * 0.8)
                ax.add_patch(circle)
                ax.text(x, y, sig, fontsize=14, color=bg_color,
                        ha='center', va='center', fontweight='bold', alpha=alpha)
                
    elif scene_num == 4:
        # Scene 4: Benchmark reveal
        ax.text(8, 7, 'RouterArena Benchmark', fontsize=44, color=text_color,
                ha='center', va='center', fontweight='bold')
        
        progress = frame_num / total_frames
        
        # Score reveal
        if progress > 0.3:
            score_alpha = min(1, (progress - 0.3) * 3)
            ax.text(8, 5, '76.43', fontsize=120, color=accent1,
                    ha='center', va='center', fontweight='bold', alpha=score_alpha,
                    family='monospace')
            ax.text(8, 3, '#1 OF 19 ROUTERS', fontsize=28, color=accent3,
                    ha='center', va='center', alpha=score_alpha)
            ax.text(8, 2, 'arXiv:2510.00202', fontsize=18, color=text_color,
                    ha='center', va='center', alpha=score_alpha * 0.7)
            
    elif scene_num == 5:
        # Scene 5: Cost comparison
        ax.text(8, 7.5, '213x Cheaper', fontsize=56, color=accent3,
                ha='center', va='center', fontweight='bold')
        
        progress = frame_num / total_frames
        
        # GPT-5 cost
        if progress > 0.2:
            alpha = min(1, (progress - 0.2) * 3)
            ax.text(4, 5, '$10.02', fontsize=64, color=accent2,
                    ha='center', va='center', fontweight='bold', alpha=alpha)
            ax.text(4, 3.5, 'GPT-5', fontsize=24, color=text_color,
                    ha='center', va='center', alpha=alpha)
            
        # A3M cost
        if progress > 0.5:
            alpha = min(1, (progress - 0.5) * 3)
            ax.text(12, 5, '$0.047', fontsize=64, color=accent3,
                    ha='center', va='center', fontweight='bold', alpha=alpha)
            ax.text(12, 3.5, 'A3M', fontsize=24, color=text_color,
                    ha='center', va='center', alpha=alpha)
            
        # VS text
        if progress > 0.7:
            alpha = min(1, (progress - 0.7) * 3)
            ax.text(8, 5, 'vs', fontsize=36, color=text_color,
                    ha='center', va='center', alpha=alpha * 0.5)
            ax.text(8, 2, 'Same quality, 1/213th the cost',
                    fontsize=22, color=text_color, ha='center', va='center', alpha=alpha)
    
    plt.tight_layout()
    plt.savefig(output_path, facecolor=bg_color, dpi=100)
    plt.close()

def main():
    if not check_deps():
        sys.exit(1)
    
    print("🎬 A3M Router — 3Blue1Brown Style Video Generator")
    print("=" * 50)
    
    # Create output directory
    output_dir = '/Users/Subho/adaptive-memory-multi-model-router/demo/frames_3b1b'
    os.makedirs(output_dir, exist_ok=True)
    
    total_scenes = len(SCENES)
    frames_per_scene = 30  # 30 frames per scene = ~1s at 30fps
    
    print(f"Generating {total_scenes} scenes, {frames_per_scene} frames each...")
    print(f"Output: {output_dir}")
    
    for scene in SCENES:
        scene_id = scene['id']
        scene_dir = os.path.join(output_dir, f'scene_{scene_id}')
        os.makedirs(scene_dir, exist_ok=True)
        
        print(f"\n📽️ Scene {scene_id}: {scene['title']}")
        
        for frame_num in range(1, frames_per_scene + 1):
            output_path = os.path.join(scene_dir, f'frame_{frame_num:04d}.png')
            generate_frame_matplotlib(scene_id, frame_num, frames_per_scene, output_path)
            
            if frame_num % 10 == 0:
                print(f"  Frame {frame_num}/{frames_per_scene}")
    
    print(f"\n✅ Generated {total_scenes * frames_per_scene} frames")
    print(f"\nNext steps:")
    print(f"1. Install ffmpeg: brew install ffmpeg")
    print(f"2. Run: ./demo/render_3b1b_video.sh")
    
    # Save scene config
    with open(os.path.join(output_dir, 'scenes.json'), 'w') as f:
        json.dump(SCENES, f, indent=2)
    
    print(f"\n3. Or use Python to create video:")
    print(f"   python3 -c \"from PIL import Image; import subprocess\"")
    print(f"   # Then run ffmpeg to compile")

if __name__ == '__main__':
    main()
