import {collectUrlItem} from './url.js';

export async function collectBrowserItem({source}) {
  if (!process.env.BROWSER_ARTICLE_FETCH_CMD) {
    return collectUrlItem({source});
  }

  throw new Error('Custom browser article fetching command is not implemented in v1.');
}
