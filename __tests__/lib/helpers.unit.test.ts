import { describe, it, expect } from "@jest/globals";
import {
  uniqueRandomArray,
  replaceAll,
  ireplaceAll,
  formatDateTime,
  saveToFile,
  FILE_SUCCESS_FORMAT,
  FILE_ERROR_FORMAT,
  arrayOfOtherPages,
} from "../../src/lib/helpers";

jest.mock("fs", () => ({
  promises: {
    writeFile: jest.fn(async () => new Promise<void>((resolve) => resolve())),
  },
}));

describe("lib/helpers", () => {
  describe("uniqueRandomArray", () => {
    it("should return a random element from the array", () => {
      const arr = [1, 2, 3, 4, 5];
      const rand = uniqueRandomArray(arr);
      const actual = rand();
      expect(arr).toContain(actual);
    });
    it("should not return the same element twice in a row", () => {
      const arr = [1, 2, 3, 4, 5];
      const rand = uniqueRandomArray(arr);
      let prev: number = rand();
      // Test 100 times in a row
      for (var i = 0; i < 100; i++) {
        const actual = rand();
        expect(actual).not.toEqual(prev);
        prev = actual;
      }
    });
  });
  describe("replaceAll", () => {
    it("should replace all occurrences of the search object with the replacement string for that object", () => {
      const str = "The quick brown fox jumps over the lazy dog.";
      const repl = {
        the: "a",
        quick: "slow",
        brown: "red",
        fox: "turtle",
        jumps: "crawls",
        over: "under",
        lazy: "energetic",
        dog: "cat",
      };
      const expected = "The slow red turtle crawls under a energetic cat.";
      const actual = replaceAll(str, repl);
      expect(actual).toEqual(expected);
    });
    it("should care about case", () => {
      const str = "The Quick Brown Fox Jumps Over the Lazy Dog.";
      const repl = {
        the: "a",
        quick: "slow",
        brown: "red",
        fox: "turtle",
        Jumps: "Crawls",
        over: "under",
        lazy: "energetic",
        dog: "cat",
      };
      const expected = "The Quick Brown Fox Crawls Over a Lazy Dog.";
      const actual = replaceAll(str, repl);
      expect(actual).toEqual(expected);
    });
  });
  describe("ireplaceAll", () => {
    it("should replace all occurrences of the search object with the replacement string for that object", () => {
      const str = "The quick brown fox jumps over the lazy dog.";
      const repl = {
        the: "a",
        quick: "slow",
        brown: "red",
        fox: "turtle",
        jumps: "crawls",
        over: "under",
        lazy: "energetic",
        dog: "cat",
      };
      const expected = "a slow red turtle crawls under a energetic cat.";
      const actual = ireplaceAll(str, repl);
      expect(actual).toEqual(expected);
    });
    it("should not care about case", () => {
      const str = "The Quick Brown Fox Jumps Over The Lazy Dog.";
      const repl = {
        the: "a",
        quick: "slow",
        brown: "red",
        fox: "turtle",
        jumps: "crawls",
        over: "under",
        lazy: "energetic",
        dog: "cat",
      };
      const expected = "a slow red turtle crawls under a energetic cat.";
      const actual = ireplaceAll(str, repl);
      expect(actual).toEqual(expected);
    });
  });
  describe("formatDateTime", () => {
    it("should return a formatted date-time string", () => {
      const date = new Date("2020-02-02T00:00:00.000");
      const format = "YYYY-MM-DD hh:mm:ss.ll AA";
      const expected = "2020-02-02 12:00:00.000 AM";
      const actual = formatDateTime(format, date);
      expect(actual).toEqual(expected);
    });
    it("should use the current date-time if no date is provided", () => {
      const date = new Date();
      const format = "YYYY-MM-DD hh:mm:ss.ll AA";
      const expected = formatDateTime(format, date);
      const actual = formatDateTime(format);
      expect(actual).toEqual(expected);
    });
  });
  describe("saveToFile", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it("should save the provided data to the provided file path", async () => {
      const fs = require("fs");
      const data = "test data";
      const path = "/test/path";
      await saveToFile(data, path);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(path, data);
    });
    it("should log success to the console when verbose logging is on", async () => {
      const data = "test data";
      const path = "/test/path";
      const verbose = true;
      const logger = {
        error: jest.fn(),
        log: jest.fn(),
      } as unknown as typeof console;
      await saveToFile(data, path, verbose, logger);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(FILE_SUCCESS_FORMAT.replace("%s", path));
    });
    it("should not log anything to the console on success when verbose logging is off", async () => {
      const data = "test data";
      const path = "/test/path";
      const verbose = false;
      const logger = {
        error: jest.fn(),
        log: jest.fn(),
      } as unknown as typeof console;
      await saveToFile(data, path, verbose, logger);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.log).not.toHaveBeenCalled();
    });
    it("should log errors to the console when verbose logging is on", async () => {
      const fs = require("fs");
      const data = "test data";
      const path = "/test/path";
      const verbose = true;
      const logger = {
        error: jest.fn(),
        log: jest.fn(),
      } as unknown as typeof console;
      const err = new Error("test error");
      fs.promises.writeFile.mockImplementationOnce(() => new Promise((_, reject) => reject(err)));
      await saveToFile(data, path, verbose, logger);
      expect(logger.error).toHaveBeenCalledWith(FILE_ERROR_FORMAT.replace("%s", err.message || err.toString()));
      expect(logger.log).not.toHaveBeenCalled();
    });
    it("should log errors to the console when verbose logging is off", async () => {
      const fs = require("fs");
      const data = "test data";
      const path = "/test/path";
      const verbose = false;
      const logger = {
        error: jest.fn(),
        log: jest.fn(),
      } as unknown as typeof console;
      const err = new Error("test error");
      fs.promises.writeFile.mockImplementationOnce(() => new Promise((_, reject) => reject(err)));
      await saveToFile(data, path, verbose, logger);
      expect(logger.error).toHaveBeenCalledWith(FILE_ERROR_FORMAT.replace("%s", err.message || err.toString()));
      expect(logger.log).not.toHaveBeenCalled();
    });
  });
  describe("arrayOfOtherPages", () => {
    it("should return an array of page numbers that are not the first page number", () => {
      const totalPages = 5;
      const expected = [2, 3, 4, 5];
      const actual = arrayOfOtherPages(totalPages);
      expect(actual).toEqual(expected);
    });
  });
});
