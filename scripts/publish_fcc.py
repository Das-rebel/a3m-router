"""
FreeCodeCamp - Publish existing draft for A3M Router article
"""
import sys, json, time, os
sys.path.insert(0, os.path.expanduser("~/omniclaw/skills/browser/sota-browser"))
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

PROFILE_PATH = "/var/folders/l9/4016_h694kdbx1wvdg5881bh0000gp/T/chrome_profile_100llyqq"
FCC_EMAIL = "subho.matteragent@gmail.com"
FCC_PASSWORD = "YourChance2025!"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            PROFILE_PATH,
            headless=False,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
        )
        page = browser.new_page()
        
        try:
            # Go to FCC publishing settings
            print("[FCC] Navigating to publishing settings...")
            page.goto("https://www.freecodecamp.org/news/settings/publishing", timeout=30000)
            time.sleep(3)
            page.screenshot(path="/tmp/fcc_1_landing.png")
            
            # Check if we need to login
            current_url = page.url
            print(f"[FCC] Current URL: {current_url}")
            
            if "login" in current_url or "signin" in current_url or "email" in page.content().lower():
                print("[FCC] Need to login...")
                # Try clicking email/password
                try:
                    # Look for email field
                    email_input = page.wait_for_selector('input[type="email"], input[name="email"], input[placeholder*="email" i]', timeout=5000)
                    email_input.fill(FCC_EMAIL)
                    time.sleep(1)
                    
                    # Look for password field
                    password_input = page.wait_for_selector('input[type="password"], input[name="password"]', timeout=5000)
                    password_input.fill(FCC_PASSWORD)
                    time.sleep(1)
                    
                    # Find and click submit
                    submit_btn = page.query_selector('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")')
                    if submit_btn:
                        submit_btn.click()
                        time.sleep(5)
                    
                    page.screenshot(path="/tmp/fcc_2_after_login.png")
                except Exception as e:
                    print(f"[FCC] Login interaction failed: {e}")
                    page.screenshot(path="/tmp/fcc_2_login_error.png")
            
            # Now try to access publishing page
            page.goto("https://www.freecodecamp.org/news/settings/publishing", timeout=30000)
            time.sleep(3)
            page.screenshot(path="/tmp/fcc_3_publishing.png")
            
            # Check for drafts
            content = page.content()
            if "draft" in content.lower():
                print("[FCC] Found drafts section!")
                
                # Try to find and click on a draft
                draft_links = page.query_selector_all('a:has-text("A3M"), a:has-text("Router"), a:has-text("LLM Infrastructure")')
                if draft_links:
                    print(f"[FCC] Found {len(draft_links)} matching draft links")
                    draft_links[0].click()
                    time.sleep(3)
                    page.screenshot(path="/tmp/fcc_4_draft_editor.png")
                    
                    # Look for publish button
                    publish_btn = page.query_selector('button:has-text("Publish"), button:has-text("Submit"), button:has-text("Post")')
                    if publish_btn:
                        print("[FCC] Found publish button, clicking...")
                        publish_btn.click()
                        time.sleep(3)
                        page.screenshot(path="/tmp/fcc_5_after_publish.png")
                        print("[FCC] Publishing attempted!")
                    else:
                        print("[FCC] No publish button found on draft page")
                else:
                    print("[FCC] No matching draft links found")
                    # List all links for debugging
                    all_links = page.query_selector_all('a[href*="draft"], a[href*="edit"]')
                    for link in all_links:
                        print(f"  Link: {link.inner_text()} -> {link.get_attribute('href')}")
            else:
                print("[FCC] No drafts section visible")
                # Check what's on the page
                print(f"[FCC] Page title: {page.title()}")
            
            # Save the screenshot for debugging
            page.screenshot(path="/tmp/fcc_final.png")
            
        except Exception as e:
            print(f"[FCC] Error: {e}")
            page.screenshot(path="/tmp/fcc_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
