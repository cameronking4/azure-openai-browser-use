import getAnnotatedDOM, {
  getUniqueElementSelectorId,
} from '../pages/Content/getAnnotatedDOM';
import { copyToClipboard } from '../pages/Content/copyToClipboard';

import ripple from '../pages/Content/ripple';
import { sleep } from './utils';

export const rpcMethods = {
  getAnnotatedDOM,
  getUniqueElementSelectorId,
  ripple,
  copyToClipboard,
} as const;

export type RPCMethods = typeof rpcMethods;
type MethodName = keyof RPCMethods;
type Payload<T extends MethodName> = Parameters<RPCMethods[T]>;
type MethodRT<T extends MethodName> = ReturnType<RPCMethods[T]>;

// Call this function from the content script
export const callRPC = async <T extends MethodName>(
  type: keyof typeof rpcMethods,
  payload?: Payload<T>,
  maxTries = 3
): Promise<MethodRT<T>> => {
  const queryOptions = { active: true, currentWindow: true };
  const activeTab = (await chrome.tabs.query(queryOptions))[0];

  if (!activeTab?.id) throw new Error('No active tab found');

  // Ensure content script is injected if not already
  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['contentScript.bundle.js'],
    });
  } catch (e) {
    // Script may already be injected, continue
    console.debug('Content script injection:', e);
  }

  let err: unknown;
  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type,
        payload: payload || [],
      });
      return response;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (i === maxTries - 1) {
        // Last try, throw a more descriptive error
        err = new Error(
          `Failed to establish connection after ${maxTries} attempts. Content script may not be loaded. Original error: ${errorMessage}`
        );
      } else {
        // Content script may not have loaded, retry after delay
        console.warn(
          `Connection attempt ${i + 1}/${maxTries} failed, retrying in 1s...`
        );
        await sleep(3000);
      }
    }
  }
  throw err;
};

const isKnownMethodName = (type: string): type is MethodName => {
  return type in rpcMethods;
};

// This function should run in the content script
export const watchForRPCRequests = () => {
  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse): true | undefined => {
      const type = message.type;
      if (isKnownMethodName(type)) {
        // @ts-expect-error we need to type payload
        const resp = rpcMethods[type](...message.payload);
        if (resp instanceof Promise) {
          resp.then((resolvedResp) => {
            sendResponse(resolvedResp);
          });

          return true;
        } else {
          sendResponse(resp);
        }
      }
    }
  );
};
