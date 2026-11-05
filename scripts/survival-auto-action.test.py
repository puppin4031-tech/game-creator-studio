"""Run with python3 scripts/survival-auto-action.test.py against the local preview."""
import asyncio
from playwright.async_api import async_playwright


async def check_target(browser, name, tool=None):
    context = await browser.new_context(viewport={"width": 1280, "height": 1800})
    page = await context.new_page()
    await page.goto("http://localhost:8080/play/survival-sim")
    await page.get_by_role("button", name=name, exact=True).first.wait_for()
    if tool:
        await page.evaluate("""tool => {
            const save = JSON.parse(localStorage.getItem('survival-world-v1'));
            save.gear = [{uid:'test-tool', itemId:tool, quality:'normal', durability:50, maxDurability:50}];
            localStorage.setItem('survival-world-v1', JSON.stringify(save));
        }""", tool)
        await page.reload()
    await page.evaluate("""() => {
        window.toolErrors = 0;
        window.audioStarts = 0;
        new MutationObserver(ms => {
            for (const m of ms) for (const n of m.addedNodes)
                if (n.nodeType === 1 && n.matches?.('[data-sonner-toast]') && /필요합니다/.test(n.textContent)) window.toolErrors++;
        }).observe(document.body, {childList:true, subtree:true});
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function(...args) {window.audioStarts++; return start.apply(this,args);};
    }""")
    # Terrain sampling can replace the initial target after simulator movement.
    # Re-select after each move until an interaction actually occurs.
    for _ in range(8):
        await page.get_by_role("button", name=name, exact=True).first.dispatch_event("click")
        await page.wait_for_timeout(300)
        attempted = await page.evaluate("""() => window.toolErrors > 0 ||
            Object.keys(JSON.parse(localStorage.getItem('survival-world-v1')).damage).length > 0""")
        if attempted:
            break
    await page.wait_for_timeout(4200)
    result = await page.evaluate("""() => ({errors:window.toolErrors, audio:window.audioStarts,
        save:JSON.parse(localStorage.getItem('survival-world-v1'))})""")
    if not tool:
        assert result["errors"] == 1, (name, result)
        assert result["audio"] == 0, (name, result)
        assert result["save"]["damage"] == {}, (name, result)
        assert result["save"]["backpack"] == [], (name, result)
    else:
        assert result["errors"] == 0, (name, result)
        assert result["save"]["depleted"], (name, result)
        assert result["save"]["backpack"], (name, result)
    print(f"PASS: {name}, {'equipped' if tool else 'missing tool'}")
    await context.close()


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        await check_target(browser, "참나무")
        await check_target(browser, "적철석 바위")
        await check_target(browser, "참나무", "hand_axe")
        await browser.close()


asyncio.run(main())