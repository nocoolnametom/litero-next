"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayOfOtherPages = exports.uniqueRandomArray = exports.saveToFile = exports.formatDateTime = exports.replaceAll = exports.ireplaceAll = exports.FILE_ERROR_FORMAT = exports.FILE_SUCCESS_FORMAT = void 0;
const fs_1 = __importDefault(require("fs"));
exports.FILE_SUCCESS_FORMAT = "File was written to *%s*";
exports.FILE_ERROR_FORMAT = "Following error occurred while attempting to write the file: %s";
function ireplaceAll(str, repl) {
    var search = new RegExp(Object.keys(repl).join("|"), "gi");
    return str.replace(search, (matched) => repl[matched.toLowerCase()].toString());
}
exports.ireplaceAll = ireplaceAll;
function replaceAll(str, repl) {
    var search = new RegExp(Object.keys(repl).join("|"), "g");
    return str.replace(search, (matched) => repl[matched].toString());
}
exports.replaceAll = replaceAll;
/**
 * This function returns a formatted date-time string.
 */
function formatDateTime(format = "YYYY-MM-DD hh:mm:ss.ll AA", date = new Date()) {
    const repl = {
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
exports.formatDateTime = formatDateTime;
async function saveToFile(data, filename, verbose = false, logger = console) {
    try {
        await fs_1.default.promises.writeFile(filename, data);
        if (verbose) {
            logger.log(exports.FILE_SUCCESS_FORMAT.replace("%s", filename));
        }
    }
    catch (err) {
        let error;
        if (err instanceof Error) {
            error = err;
        }
        else {
            error = new Error(err);
        }
        logger.error(exports.FILE_ERROR_FORMAT.replace("%s", error.message));
    }
}
exports.saveToFile = saveToFile;
// Makes a function that returns a random number that isn't the same as the previous result
function uniqueRandom(minimum, maximum) {
    let previousValue;
    const random = () => {
        const number = Math.floor(Math.random() * (maximum - minimum + 1) + minimum);
        previousValue = number === previousValue && minimum !== maximum ? random() : number;
        return previousValue;
    };
    return random;
}
// Makes a function that returns a random item from an array
function uniqueRandomArray(arr) {
    const rand = uniqueRandom(0, arr.length - 1);
    return () => arr[rand()];
}
exports.uniqueRandomArray = uniqueRandomArray;
// Makes an array of numbers from 2 to the total number of pages
function arrayOfOtherPages(totalPages) {
    return Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
}
exports.arrayOfOtherPages = arrayOfOtherPages;
