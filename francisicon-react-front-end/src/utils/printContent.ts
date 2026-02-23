/**
 * Opens a new browser window with the content from a ref element,
 * copies all stylesheets from the parent page so that Tailwind CSS
 * classes render exactly as they appear on-screen, and triggers
 * the browser's native print dialog (which lets the user print or
 * save as PDF with perfect fidelity).
 */
export function printContentFromRef(
  contentEl: HTMLElement,
  title: string = 'Print Document',
): void {
  const printWindow = window.open('', '_blank', 'width=900,height=1100')
  if (!printWindow) {
    alert('Please allow popups to print the document.')
    return
  }

  // Clone the content
  const clonedContent = contentEl.cloneNode(true) as HTMLElement

  // Build <link> tags for every stylesheet the main page has loaded.
  // This ensures Tailwind utility classes resolve identically.
  const styleSheetLinks: string[] = []
  const styleSheetInlines: string[] = []

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.href) {
        styleSheetLinks.push(
          `<link rel="stylesheet" href="${sheet.href}" />`,
        )
      } else if (sheet.ownerNode && (sheet.ownerNode as HTMLStyleElement).tagName === 'STYLE') {
        styleSheetInlines.push(
          `<style>${(sheet.ownerNode as HTMLStyleElement).textContent}</style>`,
        )
      }
    } catch {
      // CORS-restricted sheets – skip
    }
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${styleSheetLinks.join('\n  ')}
  ${styleSheetInlines.join('\n  ')}
  <style>
    /* Ensure colours print */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
    }
    @page {
      size: A4;
      margin: 8mm;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      /* Prevent blank trailing pages caused by min-height: 297mm
         colliding with @page margins */
      [data-pdf-page] {
        min-height: auto !important;
        page-break-inside: avoid;
      }
      .min-h-screen, .min-h-\\[297mm\\] {
        min-height: auto !important;
      }
    }
  </style>
</head>
<body>
  ${clonedContent.outerHTML}
</body>
</html>`)

  printWindow.document.close()

  // Wait for stylesheets to finish loading, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 400)
  }
}
