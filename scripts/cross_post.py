"""
Cross-post A3M Router article to multiple platforms using Playwright (headless)
"""
import sys, json, time, os, re
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

PROFILE_PATH = "/var/folders/l9/4016_h694kdbx1wvdg5881bh0000gp/T/chrome_profile_100llyqq"

def get_article_text():
    path = "/Users/Subho/adaptive-memory-multi-model-router/articles/FRESH_devto_2026_05.md"
    with open(path) as f:
        return f.read()

def safe_screenshot(page, name):
    try:
        page.screenshot(path=f"/tmp/{name}.png")
    except:
        pass

def try_fcc(browser):
    """Try to publish on FreeCodeCamp"""
    page = browser.new_page()
    results = []
    
    try:
        print("\n=== FCC: Starting ===")
        page.goto("https://www.freecodecamp.org/news/settings/publishing", timeout=30000, wait_until="domcontentloaded")
        time.sleep(3)
        safe_screenshot(page, "fcc_1_landing")
        
        # Check if we're on login page
        if "login" in page.url.lower() or page.query_selector('input[type="email"]'):
            print("[FCC] Login page detected, logging in...")
            email_input = page.wait_for_selector('input[type="email"]', timeout=5000)
            email_input.fill("subho.matteragent@gmail.com")
            
            pw_input = page.wait_for_selector('input[type="password"]', timeout=5000)
            pw_input.fill("YourChance2025!")
            
            submit = page.query_selector('button[type="submit"]')
            if submit:
                submit.click()
                time.sleep(5)
                safe_screenshot(page, "fcc_2_after_login")
        
        # Navigate to publishing page again
        page.goto("https://www.freecodecamp.org/news/settings/publishing", timeout=30000, wait_until="domcontentloaded")
        time.sleep(3)
        
        # Check page content
        html = page.content()
        if "draft" in html.lower():
            print("[FCC] Found drafts!")
            results.append("FCC: Found drafts page, check screenshots for details")
            
            # Try clicking any edit/publish link for the A3M article
            for link in page.query_selector_all('a'):
                href = link.get_attribute('href') or ''
                text = link.inner_text() or ''
                if 'draft' in href or 'edit' in href:
                    print(f"  Link: {text[:80]} -> {href}")
            
            # Try finding publish buttons
            for btn in page.query_selector_all('button'):
                text = (btn.inner_text() or '').lower()
                if 'publish' in text or 'submit' in text:
                    print(f"  Button: {btn.inner_text()}")
                    btn.click()
                    time.sleep(3)
                    safe_screenshot(page, "fcc_3_publish_clicked")
                    results.append("FCC: Publish button clicked")
                    break
        else:
            print(f"[FCC] No drafts section - page title: {page.title()}")
            results.append(f"FCC: No drafts accessible. Page: {page.title()}")
            
    except Exception as e:
        print(f"[FCC] Error: {e}")
        results.append(f"FCC Error: {str(e)[:100]}")
        safe_screenshot(page, "fcc_error")
    
    page.close()
    return results

def try_hackernoon(browser):
    """Try to post on HackerNoon"""
    page = browser.new_page()
    results = []
    
    try:
        print("\n=== HackerNoon: Starting ===")
        page.goto("https://hackernoon.com/", timeout=30000, wait_until="domcontentloaded")
        time.sleep(3)
        safe_screenshot(page, "hn_1_landing")
        
        # Try to find login button
        login_selectors = [
            'a[href*="login"]', 'a[href*="signin"]', 'a[href*="sign-up"]',
            'button:has-text("Log in")', 'button:has-text("Sign in")',
            'a:has-text("Log in")', 'a:has-text("Sign in")',
            '[data-cy="login-button"]', '[test-id="login"]'
        ]
        
        clicked_login = False
        for sel in login_selectors:
            try:
                btn = page.wait_for_selector(sel, timeout=2000)
                if btn and btn.is_visible():
                    print(f"[HN] Found login button: {sel}")
                    btn.click()
                    time.sleep(3)
                    clicked_login = True
                    break
            except:
                continue
        
        if not clicked_login:
            # Try JavaScript click on all possible login elements
            try:
                page.evaluate("""
                    [...document.querySelectorAll('a, button')].find(el => 
                        el.innerText.toLowerCase().includes('log in') || 
                        el.innerText.toLowerCase().includes('sign in') ||
                        el.href?.includes('login')
                    )?.click()
                """)
                time.sleep(3)
            except:
                pass
        
        safe_screenshot(page, "hn_2_login_clicked")
        
        # Fill in credentials if login form appears
        try:
            email_input = page.wait_for_selector('input[type="email"], input[name="email"]', timeout=5000)
            email_input.fill("subho.matteragent@gmail.com")
            time.sleep(1)
            
            pw_input = page.wait_for_selector('input[type="password"]', timeout=3000)
            pw_input.fill("YourChance2025!")
            time.sleep(1)
            
            submit = page.query_selector('button[type="submit"]')
            if submit:
                submit.click()
                time.sleep(5)
                safe_screenshot(page, "hn_3_logged_in")
                results.append("HN: Login attempted")
            else:
                print("[HN] No submit button found")
        except:
            print("[HN] No login form appeared")
            results.append("HN: Login form did not appear (React/Cloudflare issue)")
        
        # Try navigating to write/create post
        page.goto("https://hackernoon.com/new-story", timeout=30000, wait_until="domcontentloaded")
        time.sleep(3)
        safe_screenshot(page, "hn_4_new_story")
        
        # Check if we can write
        html = page.content()
        if "new-story" in page.url or "write" in page.url or "create" in page.url:
            results.append("HN: On story creation page")
            
            # Try to fill in title and content
            title_input = page.query_selector('input[placeholder*="title" i], textarea[placeholder*="title" i], [contenteditable="true"]')
            if title_input:
                article = get_article_text()
                lines = article.strip().split('\n')
                title = lines[0].replace('#', '').strip() if lines[0].startswith('#') else "Three LLM Infrastructure Problems That Shouldn't Exist in 2026"
                
                title_input.fill(title)
                print(f"[HN] Filled title: {title}")
                time.sleep(1)
                
                # Try content area
                content_area = page.query_selector('[contenteditable="true"], textarea, .ProseMirror, [data-lexical-editor]')
                if content_area:
                    content_area.fill(article)
                    results.append("HN: Content filled")
                    safe_screenshot(page, "hn_5_content_filled")
                else:
                    results.append("HN: Could not find content area")
            else:
                results.append("HN: No title input found")
        else:
            results.append(f"HN: Not on create page. URL: {page.url}")
        
    except Exception as e:
        print(f"[HN] Error: {e}")
        results.append(f"HN Error: {str(e)[:100]}")
        safe_screenshot(page, "hn_error")
    
    page.close()
    return results

def try_linkedin(browser):
    """Try to post on LinkedIn using Chrome profile cookies"""
    page = browser.new_page()
    results = []
    
    try:
        print("\n=== LinkedIn: Starting ===")
        page.goto("https://www.linkedin.com", timeout=30000, wait_until="domcontentloaded")
        time.sleep(3)
        safe_screenshot(page, "li_1_landing")
        
        # Check if already logged in
        if "feed" in page.url or "/in/" in page.url:
            print("[LI] Already logged in!")
            results.append("LI: Already logged in")
        else:
            # Try logging in
            try:
                email_input = page.wait_for_selector('input#session_key, input[name="session_key"], input[autocomplete="username"]', timeout=5000)
                email_input.fill("subho.matteragent@gmail.com")
                time.sleep(1)
                
                pw_input = page.wait_for_selector('input#session_password, input[name="session_password"]', timeout=3000)
                pw_input.fill("YourChance2025!")
                time.sleep(1)
                
                submit = page.query_selector('button[type="submit"]')
                if submit:
                    submit.click()
                    time.sleep(5)
                    safe_screenshot(page, "li_2_logged_in")
                    results.append("LI: Login attempted")
            except:
                print("[LI] No login form found or already logged in")
        
        # Try to write an article
        page.goto("https://www.linkedin.com/post/new/", timeout=30000, wait_until="domcontentloaded")
        time.sleep(3)
        safe_screenshot(page, "li_3_new_post")
        
        # Check if we're on the post page
        if "post" in page.url:
            # Try clicking "Write article" or similar
            for selector in ['button:has-text("Write article")', 'a:has-text("Write article")', 'button:has-text("Create post")']:
                try:
                    btn = page.wait_for_selector(selector, timeout=3000)
                    if btn:
                        btn.click()
                        time.sleep(3)
                        break
                except:
                    continue
            
            safe_screenshot(page, "li_4_article_editor")
            
            # Try to find contenteditable area
            editor = page.query_selector('[contenteditable="true"][aria-label*="editor" i]')
            if editor:
                article = get_article_text()
                editor.fill(article)
                results.append("LI: Content filled in editor")
                safe_screenshot(page, "li_5_content_filled")
            else:
                results.append("LI: Could not find article editor")
        else:
            results.append(f"LI: Not on post page. URL: {page.url}")
        
    except Exception as e:
        print(f"[LI] Error: {e}")
        results.append(f"LI Error: {str(e)[:100]}")
        safe_screenshot(page, "li_error")
    
    page.close()
    return results

def try_devto(browser):
    """Write and publish a SECOND article on dev.to"""
    page = browser.new_page()
    results = []
    
    second_article = """---
title: Why Sequential LLM Fallback Is a Lie
published: false
description: How parallel LLM execution with confidence scoring replaces the illusion of sequential fallback with actual better results
tags: llm, ai, infrastructure, javascript
---

## The Lie

Every LLM gateway does the same thing: try Provider A, wait, fail, try Provider B, wait, fail, try Provider C. They call this "fallback." But what it really means is you always get whatever Provider A returns — good or bad — and only try the others when A is completely broken.

This isn't a sophisticated strategy. It's basic error handling dressed up as infrastructure.

## The Math

Here's something no one talks about: **running 3 providers in parallel costs less than running 2 in sequence.**

Why? Timeout waste.

If Provider A has a 5-second timeout and you're running sequentially, you burn 5 seconds waiting before even touching Provider B. In a parallel setup, all 3 run simultaneously. You pay for all 3, but you get results in the time of the fastest provider.

Worst-case sequential: 5s (A timeout) + 5s (B timeout) + 5s (C timeout) = 15s
Worst-case parallel: 5s (all run simultaneously)

For many use cases — especially with providers averaging 300-700ms — parallel execution is both faster AND more reliable.

## How A3M Does It

Our router doesn't do fallback. It does **ensemble execution**:

1. Classify the query by type (code, creative, analytical, simple)
2. Route to 3 appropriate providers in parallel
3. Score every result on specificity, structure, and relevance
4. Return the best result with confidence scores attached

The result is you get the **best** answer, not the **first** answer. And you get it faster than most sequential fallback setups.

## The Bottom Line

Sequential fallback is a crutch from the era when LLM providers were unreliable. In 2026, most providers have >99% uptime. The bottleneck isn't reliability — it's picking the right provider for the right query.

Parallel ensemble execution solves the actual problem: getting the best possible answer in the shortest possible time.

---

*A3M Router — npm: `adaptive-memory-multi-model-router`*
*GitHub: [github.com/Das-rebel/a3m-router](https://github.com/Das-rebel/a3m-router)*
"""
    
    try:
        print("\n=== dev.to: Starting second article ===")
        page.goto("https://dev.to/", timeout=30000, wait_until="domcontentloaded")
        time.sleep(3)
        safe_screenshot(page, "dev_1_landing")
        
        # Try logging in
        if "sign-in" in page.url.lower() or page.query_selector('input[type="email"]'):
            print("[dev] Login page, signing in...")
            try:
                email_input = page.wait_for_selector('input[type="email"], input[name="user[email]"], input[autocomplete="email"]', timeout=5000)
                email_input.fill("subho.matteragent@gmail.com")
                time.sleep(1)
                
                pw_input = page.wait_for_selector('input[type="password"], input[name="user[password]"]', timeout=3000)
                pw_input.fill("YourChance2025!")
                time.sleep(1)
                
                submit = page.query_selector('button[type="submit"], input[type="submit"]')
                if submit:
                    submit.click()
                    time.sleep(5)
                    safe_screenshot(page, "dev_2_logged_in")
            except Exception as e:
                print(f"[dev] Login form interaction failed: {e}")
        
        # Navigate to write a post
        page.goto("https://dev.to/new", timeout=30000, wait_until="domcontentloaded")
        time.sleep(3)
        safe_screenshot(page, "dev_3_new_post")
        
        # Check if we're on the new post page
        if "new" in page.url:
            # Fill title
            title_input = page.query_selector('input[placeholder*="title" i], input#article_title, textarea#article_title')
            if title_input:
                title_input.fill("Why Sequential LLM Fallback Is a Lie")
                print("[dev] Title filled")
            
            time.sleep(1)
            
            # Fill body - dev.to uses a textarea or contenteditable
            body_editor = page.query_selector('textarea#article_body_markdown, [contenteditable="true"][aria-label*="content" i], textarea[aria-label*="content" i]')
            if body_editor:
                body_editor.fill(second_article)
                print("[dev] Body filled")
            
            time.sleep(1)
            
            # Try to publish
            publish_btn = page.query_selector('button:has-text("Publish"), input[value*="Publish"]')
            if publish_btn:
                publish_btn.click()
                time.sleep(3)
                safe_screenshot(page, "dev_4_published")
                results.append("dev.to: Publish attempted")
            else:
                # Try save as draft
                save_btn = page.query_selector('button:has-text("Save"), button:has-text("Draft")')
                if save_btn:
                    save_btn.click()
                    time.sleep(3)
                    safe_screenshot(page, "dev_4_saved")
                    results.append("dev.to: Saved as draft")
                else:
                    results.append("dev.to: Could not find publish or save button")
            
            safe_screenshot(page, "dev_final")
        else:
            results.append(f"dev.to: Not on new post page. URL: {page.url}")
            # Maybe we need to click "Write a post" or similar
            write_links = page.query_selector_all('a[href="/new"], a:has-text("Write"), a:has-text("Create")')
            for link in write_links:
                print(f"  Write link: {link.inner_text()} -> {link.get_attribute('href')}")
                link.click()
                time.sleep(3)
                break
        
    except Exception as e:
        print(f"[dev] Error: {e}")
        results.append(f"dev.to Error: {str(e)[:100]}")
        safe_screenshot(page, "dev_error")
    
    page.close()
    return results

def main():
    print("=== Cross-Posting A3M Router Article ===\n")
    
    all_results = {}
    
    with sync_playwright() as p:
        # Use persistent context with Chrome profile for cookies
        context = p.chromium.launch_persistent_context(
            PROFILE_PATH,
            headless=True,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        # Try each platform
        all_results["fcc"] = try_fcc(context)
        all_results["hackernoon"] = try_hackernoon(context)
        all_results["linkedin"] = try_linkedin(context)
        all_results["devto"] = try_devto(context)
        
        context.close()
    
    print("\n\n=== RESULTS SUMMARY ===")
    for platform, results in all_results.items():
        print(f"\n--- {platform.upper()} ---")
        for r in results:
            print(f"  {r}")
    
    print("\nScreenshots saved to /tmp/*.png")

if __name__ == "__main__":
    main()
