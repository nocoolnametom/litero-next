import fs from "fs";
import userAgents from "./useragents.json";

export const FILE_SUCCESS_FORMAT = "File was written to *%s*";
export const FILE_ERROR_FORMAT = "Following error occurred while attempting to write the file: %s";

export const getRandomUserAgent = uniqueRandomArray(userAgents);

export function ireplaceAll(str: string, repl: { [search: string]: string | number }): string {
  var search = new RegExp(Object.keys(repl).join("|"), "gi");
  return str.replace(search, (matched) => repl[matched.toLowerCase()].toString());
}

export function replaceAll(str: string, repl: { [search: string]: string | number }): string {
  var search = new RegExp(Object.keys(repl).join("|"), "g");
  return str.replace(search, (matched) => repl[matched].toString());
}

/**
 * This function returns a formatted date-time string.
 */
export function formatDateTime(format: string = "YYYY-MM-DD hh:mm:ss.ll AA", date: Date = new Date()): string {
  const repl: { [key: string]: string | number } = {
    YYYY: date.getFullYear(),
    YY: date.getFullYear().toString().slice(-2),
    MM: ("0" + (date.getMonth() + 1)).slice(-2),
    DD: ("0" + date.getDate()).slice(-2),
    hh: ("0" + (((date.getHours() + 11) % 12) + 1)).slice(-2),
    HH: ("0" + date.getHours()).slice(-2),
    mm: ("0" + date.getMinutes()).slice(-2),
    ss: ("0" + date.getSeconds()).slice(-2),
    ll: ("00" + date.getMilliseconds()).slice(-3),
    AA: date.getHours() >= 12 ? "PM" : "AM",
    aa: date.getHours() >= 12 ? "pm" : "am",
  };

  // Now we use the replaceAll function to format the date-time string.
  return replaceAll(format, repl);
}

export async function saveToFile(data: string, filename: string, verbose: boolean = false, logger = console): Promise<void> {
  try {
    await fs.promises.writeFile(filename, data);
    if (verbose) {
      logger.log(FILE_SUCCESS_FORMAT.replace("%s", filename));
    }
  } catch (err) {
    let error: Error;
    if (err instanceof Error) {
      error = err;
    } else {
      error = new Error(err as any);
    }
    logger.error(FILE_ERROR_FORMAT.replace("%s", error.message));
  }
}

// Makes a function that returns a random number that isn't the same as the previous result
function uniqueRandom(minimum: number, maximum: number): () => number {
  let previousValue: number;

  const random = () => {
    const number = Math.floor(Math.random() * (maximum - minimum + 1) + minimum);
    previousValue = number === previousValue && minimum !== maximum ? random() : number;
    return previousValue;
  };

  return random;
}

// Makes a function that returns a random item from an array
export function uniqueRandomArray<T>(arr: T[]): () => T {
  const rand = uniqueRandom(0, arr.length - 1);
  return () => arr[rand()];
}

// Makes an array of numbers from 2 to the total number of pages
export function arrayOfOtherPages(totalPages: number): number[] {
  return Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
}
