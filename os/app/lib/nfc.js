/**
 * Web NFC helper — best-effort, Android Chrome only.
 * Falls back gracefully on unsupported browsers.
 */

export function isNfcSupported() {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

/**
 * Scan a single NFC tag and return its serial number (UID).
 * Stops scanning after the first read.
 *
 * @param {Object} opts
 * @param {(uid: string) => void} opts.onUid - called with the tag serial/UID
 * @param {(err: Error) => void} opts.onError - called on failure
 * @returns {{ abort: () => void }} controller to cancel scan
 */
export function scanUidOnce({ onUid, onError }) {
  const ac = new AbortController();

  (async () => {
    try {
      const reader = new NDEFReader();
      await reader.scan({ signal: ac.signal });

      reader.addEventListener("reading", (event) => {
        const uid = event.serialNumber || "";
        if (uid && uid !== "") {
          ac.abort();
          onUid(uid.toUpperCase().replace(/:/g, ""));
        } else {
          onError(new Error("Tag has no serial number"));
        }
      }, { signal: ac.signal });

      reader.addEventListener("readingerror", () => {
        ac.abort();
        onError(new Error("Could not read NFC tag"));
      }, { signal: ac.signal });
    } catch (err) {
      if (err.name !== "AbortError") {
        onError(err);
      }
    }
  })();

  return { abort: () => ac.abort() };
}
