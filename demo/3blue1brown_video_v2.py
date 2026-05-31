#!/usr/bin/env python3
"""
A3M Router — 3Blue1Brown Style Explainer Video Generator
Improved version with more frames and better animations
"""

import subprocess
import json
import sys
import os
import shutil

def run_command(cmd, cwd=None):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
    return result.returncode == 0, result.stdout, result.stderr

def check_deps():
    try:
        import matplotlib
        import numpy
        print("✅ matplotlib, numpy available")
        return True
    except ImportError as e:
        print(f"❌ Missing: {e}")
        return False

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
    accent5 = '#a855f7'  # Purple
    
    fig, ax = plt.subplots(figsize=(16, 9), facecolor=bg_color)
    ax.set_facecolor(bg_color)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9)
    ax.axis('off')
    
    # Smooth animation progress (ease-in-out)
    def ease(t):
        return t * t * (3 - 2 * t)  # Smoothstep
    
    progress = ease(frame_num / total_frames)
    
    if scene_num == 1:
        # Scene 1: The problem - expensive AI
        ax.text(8, 6.5, 'The Problem:', fontsize=36, color=text_color,
                ha='center', va='center', alpha=0.8)
        ax.text(8, 5, '$10.02', fontsize=140, color=accent2, 
                ha='center', va='center', fontweight='bold', family='monospace',
                alpha=progress)
        ax.text(8, 2.5, 'per 1,000 queries', fontsize=32, color=text_color,
                ha='center', va='center', alpha=progress * 0.9)
        ax.text(8, 1.2, 'GPT-4o premium pricing', fontsize=20, color=text_color,
                ha='center', va='center', alpha=progress * 0.6, style='italic')
        
        # Floating dollar signs
        for i in range(int(progress * 15)):
            x = 2 + (i % 5) * 2.8 + np.sin(i * 0.7) * 0.5
            y = 7.5 - (i // 5) * 2 + np.cos(i * 0.5) * 0.3
            size = 20 + (i % 3) * 10
            ax.text(x, y, '$', fontsize=size, color=accent2, alpha=0.4)
            
    elif scene_num == 2:
        # Scene 2: The routing concept
        ax.text(8, 7.5, 'The Solution:', fontsize=36, color=text_color,
                ha='center', va='center', alpha=0.8)
        ax.text(8, 6.2, 'Intelligent LLM Routing', fontsize=48, color=accent1,
                ha='center', va='center', fontweight='bold', alpha=progress)
        
        # Query → Router → Provider flow
        query_x = 2.5
        router_x = 8
        provider_x = 13.5
        
        # Query box (animate in)
        if progress > 0.1:
            q_alpha = min(1, (progress - 0.1) * 3)
            rect = patches.FancyBboxPatch((query_x - 1.2, 3.2), 2.4, 2, 
                                           boxstyle="round,pad=0.15",
                                           facecolor=accent3, edgecolor='white', 
                                           linewidth=3, alpha=q_alpha)
            ax.add_patch(rect)
            ax.text(query_x, 4.2, 'YOUR', fontsize=20, color=bg_color,
                    ha='center', va='center', fontweight='bold', alpha=q_alpha)
            ax.text(query_x, 3.6, 'QUERY', fontsize=20, color=bg_color,
                    ha='center', va='center', fontweight='bold', alpha=q_alpha)
        
        # Router box
        if progress > 0.3:
            r_alpha = min(1, (progress - 0.3) * 3)
            rect = patches.FancyBboxPatch((router_x - 1.8, 2.5), 3.6, 3.4, 
                                           boxstyle="round,pad=0.15",
                                           facecolor=accent1, edgecolor='white', 
                                           linewidth=4, alpha=r_alpha)
            ax.add_patch(rect)
            ax.text(router_x, 4.7, 'A3M', fontsize=36, color=text_color,
                    ha='center', va='center', fontweight='bold', alpha=r_alpha)
            ax.text(router_x, 3.7, 'ROUTER', fontsize=28, color=text_color,
                    ha='center', va='center', fontweight='bold', alpha=r_alpha)
            ax.text(router_x, 2.9, '<1ms • No GPU', fontsize=14, color='white',
                    ha='center', va='center', alpha=r_alpha * 0.8)
        
        # Provider boxes
        if progress > 0.5:
            providers = [
                ('FREE', 'Groq', accent3, 6),
                ('CHEAP', 'Mistral', accent4, 4.2),
                ('PREMIUM', 'GPT-4o', accent2, 2.4)
            ]
            for name, model, color, y in providers:
                p_alpha = min(1, (progress - 0.5) * 2)
                rect = patches.FancyBboxPatch((provider_x - 1.5, y - 0.4), 3, 0.8,
                                               boxstyle="round,pad=0.1",
                                               facecolor=color, edgecolor='white',
                                               linewidth=2, alpha=p_alpha * 0.9)
                ax.add_patch(rect)
                ax.text(provider_x, y, f'{name}', fontsize=14, color=bg_color,
                        ha='center', va='center', fontweight='bold', alpha=p_alpha)
        
        # Arrows
        if progress > 0.2:
            a_alpha = min(1, (progress - 0.2) * 3)
            ax.annotate('', xy=(router_x - 1.8, 4.2), xytext=(query_x + 1.2, 4.2),
                        arrowprops=dict(arrowstyle='->', color=accent1, lw=3), alpha=a_alpha)
        
        if progress > 0.5:
            for y in [6, 4.2, 2.4]:
                ax.annotate('', xy=(provider_x - 1.5, y), xytext=(router_x + 1.8, 4.2),
                            arrowprops=dict(arrowstyle='->', color='white', lw=2), alpha=0.5)
                
    elif scene_num == 3:
        # Scene 3: 12 signals
        ax.text(8, 7.8, '12 Keyword Signals', fontsize=48, color=accent1,
                ha='center', va='center', fontweight='bold', alpha=progress)
        ax.text(8, 6.8, 'Instant multi-dimensional query analysis', fontsize=22, 
                color=text_color, ha='center', va='center', alpha=progress * 0.7)
        
        signals = [
            ('code', accent1), ('math', accent3), ('creative', accent4), 
            ('factual', accent2), ('simple', accent1), ('complex', accent3),
            ('debug', accent4), ('explain', accent2), ('short', accent1),
            ('long', accent3), ('structured', accent4), ('open', accent2)
        ]
        
        cols = 4
        for idx, (sig, color) in enumerate(signals):
            row = idx // cols
            col = idx % cols
            x = 3.2 + col * 2.7
            y = 5.2 - row * 1.7
            
            # Staggered animation
            sig_progress = max(0, min(1, (progress - idx * 0.06) * 4))
            if sig_progress > 0:
                circle = patches.Circle((x, y), 0.6, color=color, alpha=sig_progress * 0.85)
                ax.add_patch(circle)
                ax.text(x, y, sig, fontsize=16, color=bg_color,
                        ha='center', va='center', fontweight='bold', alpha=sig_progress)
        
        # Bottom text
        if progress > 0.8:
            ax.text(8, 1, 'Zero ML training • No GPU required • Runs anywhere', 
                    fontsize=16, color=text_color, ha='center', va='center',
                    alpha=(progress - 0.8) * 5, style='italic')
            
    elif scene_num == 4:
        # Scene 4: RouterArena results
        ax.text(8, 7.5, 'Official Benchmark Results', fontsize=40, color=text_color,
                ha='center', va='center', fontweight='bold', alpha=0.8)
        ax.text(8, 6.5, 'RouterArena (arXiv:2510.00202)', fontsize=20, color=accent3,
                ha='center', va='center', alpha=progress * 0.7)
        
        # Big score reveal
        if progress > 0.2:
            score_alpha = min(1, (progress - 0.2) * 2.5)
            ax.text(8, 4.5, '76.43', fontsize=140, color=accent1,
                    ha='center', va='center', fontweight='bold', alpha=score_alpha,
                    family='monospace')
            
        if progress > 0.4:
            ax.text(8, 2.8, '#1', fontsize=72, color=accent4,
                    ha='center', va='center', fontweight='bold',
                    alpha=min(1, (progress - 0.4) * 3))
            ax.text(8, 2, 'OUT OF 19 ROUTERS', fontsize=24, color=text_color,
                    ha='center', va='center',
                    alpha=min(1, (progress - 0.4) * 3))
            
        if progress > 0.6:
            # Comparison bars
            bars = [
                ('A3M', 76.43, accent1),
                ('Sqwish', 75.27, accent3),
                ('GPT-5', 64.32, accent2),
            ]
            bar_y = 0.8
            for name, score, color in bars:
                bar_alpha = min(1, (progress - 0.6) * 2)
                bar_width = (score / 100) * 12
                rect = patches.FancyBboxPatch((2, bar_y), bar_width, 0.4,
                                               boxstyle="round,pad=0.05",
                                               facecolor=color, alpha=bar_alpha * 0.8)
                ax.add_patch(rect)
                ax.text(14.5, bar_y + 0.2, f'{name}: {score}', fontsize=14,
                        color=text_color, ha='right', va='center', alpha=bar_alpha)
                bar_y += 0.6
                
    elif scene_num == 5:
        # Scene 5: 213x savings
        ax.text(8, 7.2, '213× Cheaper', fontsize=64, color=accent3,
                ha='center', va='center', fontweight='bold', alpha=progress)
        
        if progress > 0.2:
            # GPT-5 side
            gpt_alpha = min(1, (progress - 0.2) * 3)
            ax.text(4, 5, '$10.02', fontsize=72, color=accent2,
                    ha='center', va='center', fontweight='bold', alpha=gpt_alpha)
            ax.text(4, 3.5, 'GPT-5', fontsize=28, color=text_color,
                    ha='center', va='center', alpha=gpt_alpha)
            
        if progress > 0.5:
            # A3M side
            a3m_alpha = min(1, (progress - 0.5) * 3)
            ax.text(12, 5, '$0.047', fontsize=72, color=accent3,
                    ha='center', va='center', fontweight='bold', alpha=a3m_alpha)
            ax.text(12, 3.5, 'A3M', fontsize=28, color=text_color,
                    ha='center', va='center', alpha=a3m_alpha)
            
        if progress > 0.7:
            # VS divider
            vs_alpha = min(1, (progress - 0.7) * 4)
            ax.text(8, 5, 'vs', fontsize=48, color=text_color,
                    ha='center', va='center', alpha=vs_alpha * 0.5)
            
        if progress > 0.8:
            ax.text(8, 2, 'Same quality routing • 1/213th the cost',
                    fontsize=20, color=text_color, ha='center', va='center',
                    alpha=(progress - 0.8) * 5, style='italic')
            
        if progress > 0.9:
            ax.text(8, 1, 'github.com/Das-rebel/a3m-router',
                    fontsize=16, color=accent1, ha='center', va='center',
                    alpha=(progress - 0.9) * 10)
    
    plt.tight_layout()
    plt.savefig(output_path, facecolor=bg_color, dpi=100)
    plt.close()

def main():
    if not check_deps():
        sys.exit(1)
    
    print("🎬 A3M Router — 3Blue1Brown Style Video Generator v2")
    print("=" * 55)
    
    output_dir = '/Users/Subho/adaptive-memory-multi-model-router/demo/frames_3b1b_v2'
    
    # Clean old frames
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)
    
    scenes = [
        {"id": 1, "title": "The Problem", "duration": 4.0},
        {"id": 2, "title": "The Solution", "duration": 5.0},
        {"id": 3, "title": "12 Signals", "duration": 5.0},
        {"id": 4, "title": "Benchmark", "duration": 4.0},
        {"id": 5, "title": "213x Savings", "duration": 4.0},
    ]
    
    fps = 30
    total_frames = 0
    
    for scene in scenes:
        scene_id = scene['id']
        scene_dir = os.path.join(output_dir, f'scene_{scene_id}')
        os.makedirs(scene_dir)
        
        num_frames = int(scene['duration'] * fps)
        total_frames += num_frames
        
        print(f"\n📽️ Scene {scene_id}: {scene['title']} ({num_frames} frames)")
        
        for frame_num in range(1, num_frames + 1):
            output_path = os.path.join(scene_dir, f'frame_{frame_num:04d}.png')
            generate_frame_matplotlib(scene_id, frame_num, num_frames, output_path)
            
            if frame_num % 30 == 0:
                print(f"  ✓ Frame {frame_num}/{num_frames}")
    
    print(f"\n✅ Generated {total_frames} total frames ({total_frames/fps:.1f}s)")
    
    # Save scene config
    with open(os.path.join(output_dir, 'config.json'), 'w') as f:
        json.dump({"scenes": scenes, "fps": fps}, f, indent=2)
    
    return output_dir

if __name__ == '__main__':
    output = main()
    print(f"\nOutput directory: {output}")
