export function attachDebugger(tabId: number) {
  return new Promise<void>((resolve, reject) => {
    try {
      // First check if we can debug this tab
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(
            new Error(
              `Failed to get tab info: ${chrome.runtime.lastError.message}`
            )
          );
          return;
        }

        const url = tab.url || '';
        if (
          url.startsWith('chrome://') ||
          url.startsWith('chrome-extension://') ||
          url.startsWith('devtools://')
        ) {
          reject(
            new Error(
              'Cannot attach debugger to restricted URLs (chrome://, chrome-extension://, devtools://)'
            )
          );
          return;
        }

        // If URL is allowed, proceed with attaching debugger
        chrome.debugger.attach({ tabId }, '1.2', async () => {
          if (chrome.runtime.lastError) {
            console.error(
              'Failed to attach debugger:',
              chrome.runtime.lastError.message
            );
            reject(
              new Error(
                `Failed to attach debugger: ${chrome.runtime.lastError.message}`
              )
            );
            return;
          }

          try {
            console.log('attached to debugger');
            await chrome.debugger.sendCommand({ tabId }, 'DOM.enable');
            console.log('DOM enabled');
            await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');
            console.log('Runtime enabled');
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function detachDebugger(tabId: number) {
  const targets = await chrome.debugger.getTargets();
  const isAttached = targets.some(
    (target) => target.tabId === tabId && target.attached
  );
  if (isAttached) {
    chrome.debugger.detach({ tabId: tabId });
  }
}
