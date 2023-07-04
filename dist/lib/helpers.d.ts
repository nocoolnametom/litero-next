export declare const FILE_SUCCESS_FORMAT = "File was written to *%s*";
export declare const FILE_ERROR_FORMAT = "Following error occurred while attempting to write the file: %s";
export declare function ireplaceAll(str: string, repl: {
    [search: string]: string | number;
}): string;
export declare function replaceAll(str: string, repl: {
    [search: string]: string | number;
}): string;
/**
 * This function returns a formatted date-time string.
 */
export declare function formatDateTime(format?: string, date?: Date): string;
export declare function saveToFile(data: string, filename: string, verbose?: boolean, logger?: Console): Promise<void>;
export declare function uniqueRandomArray<T>(arr: T[]): () => T;
export declare function arrayOfOtherPages(totalPages: number): number[];
