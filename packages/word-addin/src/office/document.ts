/** Read the open Word document as .docx bytes via Office.js */
export function getDocumentBytes(): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    Office.context.document.getFileAsync(
      Office.FileType.Compressed,
      { sliceSize: 4 * 1024 * 1024 },
      (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          reject(new Error(result.error?.message ?? "Failed to read document"));
          return;
        }
        const file = result.value;
        const slices: Uint8Array[] = [];
        let index = 0;

        const readSlice = () => {
          file.getSliceAsync(index, (sliceResult) => {
            if (sliceResult.status !== Office.AsyncResultStatus.Succeeded) {
              file.closeAsync();
              reject(
                new Error(sliceResult.error?.message ?? "Failed to read slice"),
              );
              return;
            }
            const slice = sliceResult.value;
            slices.push(new Uint8Array(slice.data as ArrayBuffer));
            index++;
            if (index < file.sliceCount) {
              readSlice();
            } else {
              file.closeAsync();
              const total = slices.reduce((n, s) => n + s.length, 0);
              const merged = new Uint8Array(total);
              let offset = 0;
              for (const s of slices) {
                merged.set(s, offset);
                offset += s.length;
              }
              resolve(merged);
            }
          });
        };

        readSlice();
      },
    );
  });
}

export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mime: string,
): void {
  const blob = new Blob([Uint8Array.from(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function canOpenDocumentInWord(): boolean {
  return Office.context.requirements.isSetSupported("WordApi", "1.3");
}

function sanitiseFileName(name: string): string {
  return name.replace(/\.docx$/i, "").replace(/[<>:"/\\|?*]/g, "_").trim();
}

/** Opens anonymised bytes in a new Word window (desktop only). */
export async function openDocumentInWord(
  bytes: Uint8Array,
  fileName: string,
): Promise<void> {
  if (!canOpenDocumentInWord()) {
    throw new Error("Open in Word is only available in Word desktop.");
  }

  const base64 = bytesToBase64(bytes);
  const saveName = sanitiseFileName(fileName);
  await Word.run(async (context) => {
    const doc = context.application.createDocument(base64);
    doc.open();
    await context.sync();
    if (saveName) {
      doc.save(Word.SaveBehavior.save, saveName);
      await context.sync();
    }
  });
}
