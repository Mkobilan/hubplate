export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdf = require("pdf-parse");
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error("Failed to extract text from PDF");
    }
}
