
const fs = require("fs/promises");
const path = require("path");

const appScriptService = require("./appScriptService");
const dateUtils = require("../utils/dateUtils");

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));


// Record existing payroll summary files before generation.
async function getExistingReports(folder) {

    const files = new Map();

    let names;

    try {
        names = await fs.readdir(folder);
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return files;
        }

        throw error;
    }

    for (const name of names) {

        if (
            !name.startsWith("Payroll Summary ") ||
            !name.endsWith(".pdf")
        ) {
            continue;
        }

        const stats = await fs.stat(
            path.join(folder, name)
        );

        files.set(name, {
            size: stats.size,
            mtimeMs: stats.mtimeMs,
            ctimeMs: stats.ctimeMs
        });
    }

    return files;
}


// Check basic PDF structure.
async function isValidPdf(filePath, size) {

    if (size < 1024) {
        return false;
    }

    const file = await fs.open(filePath, "r");

    try {

        const header = Buffer.alloc(5);

        await file.read(header, 0, 5, 0);

        if (header.toString() !== "%PDF-") {
            return false;
        }

        const tailSize = Math.min(size, 2048);
        const tail = Buffer.alloc(tailSize);

        await file.read(
            tail,
            0,
            tailSize,
            size - tailSize
        );

        return tail.includes(Buffer.from("%%EOF"));

    }
    finally {
        await file.close();
    }
}


// Wait for a newly generated, stable PDF.
async function waitForSummaryPdf(
    filePath,
    previous,
    timeout = 120000
) {

    const start = Date.now();

    let lastSignature = "";
    let stableChecks = 0;

    while (Date.now() - start < timeout) {

        try {

            const stats = await fs.stat(filePath);

            const signature = [
                stats.size,
                stats.mtimeMs,
                stats.ctimeMs
            ].join(":");

            const previousSignature = previous
                ? [
                    previous.size,
                    previous.mtimeMs,
                    previous.ctimeMs
                ].join(":")
                : null;

            const changed =
                signature !== previousSignature;

            const valid =
                changed &&
                await isValidPdf(filePath, stats.size);

            if (valid) {

                stableChecks =
                    signature === lastSignature
                        ? stableChecks + 1
                        : 1;

                lastSignature = signature;

                if (stableChecks >= 3) {
                    return filePath;
                }

            }
            else {
                stableChecks = 0;
                lastSignature = "";
            }

        }
        catch (error) {

            if (
                error.code !== "ENOENT" &&
                error.code !== "EBUSY"
            ) {
                throw error;
            }

        }

        await sleep(1500);
    }

    throw new Error(
        "Timed out waiting for the updated payroll summary PDF. " +
        "Check Google Drive synchronization."
    );
}


// Main generation and validation workflow.
async function preparePayrollSummary(
    config,
    onProgress = () => {}
) {

    if (!config.appsScriptUrl || !config.pdfRootFolder) {
        throw new Error(
            "Apps Script URL and PDF root folder are required."
        );
    }

    const pdfFolder = dateUtils.getPdfFolder(
        config.pdfRootFolder
    );

    onProgress({
        type: "status",
        message: "Preparing payroll summary generation..."
    });

    const existingReports =
        await getExistingReports(pdfFolder);

    onProgress({
        type: "status",
        message: "Generating payroll summary..."
    });

    const result =
        await appScriptService.generatePayrollSummary(
            config.appsScriptUrl
        );

    const fileName = result.fileName;

    // Reject unexpected filenames or directory traversal.
    if (
        typeof fileName !== "string" ||
        !fileName.startsWith("Payroll Summary ") ||
        !fileName.endsWith(".pdf") ||
        path.basename(fileName) !== fileName ||
        fileName.includes("\\") ||
        fileName.includes("/")
    ) {
        throw new Error(
            "Apps Script returned an invalid payroll summary filename."
        );
    }

    const pdfPath = path.join(
        pdfFolder,
        fileName
    );

    onProgress({
        type: "status",
        message: "Waiting for Google Drive synchronization..."
    });

    await waitForSummaryPdf(
        pdfPath,
        existingReports.get(fileName)
    );

    onProgress({
        type: "success",
        message: "Payroll summary PDF is ready."
    });

    return {
        success: true,
        month: result.month,
        fileName,
        pdfPath
    };
}


module.exports = {
    preparePayrollSummary
};
