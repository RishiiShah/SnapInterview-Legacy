import { describe, it, expect } from 'vitest';
import { PDFParse } from 'pdf-parse';

describe('PDFParse Standalone Test', () => {
    it('correctly parses a minimal valid PDF from a Uint8Array', async () => {
        const pdfData = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 21\n>>\nstream\nBT\n/F1 24 Tf\n(Test) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000201 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n273\n%%EOF');
        
        // Simulate File.arrayBuffer() -> Uint8Array
        const arrBuf = pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength);
        const uint8Arr = new Uint8Array(arrBuf);
        
        expect(Buffer.isBuffer(uint8Arr)).toBe(false);
        
        const parser = new PDFParse({ data: uint8Arr });
        try {
            const result = await parser.getText();
            expect(result.text).toContain('Test');
        } finally {
            await parser.destroy();
        }
    });
});
