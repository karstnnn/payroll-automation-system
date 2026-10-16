const fs = require("fs");
const path = require("path");

// Matches the current dateUtils format: "October 2026".
const payslipHistoryName =
    /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\.json(?:\.tmp)?$/;

function inspectPath(target, directory) {
    let stat;

    try {
        stat = fs.lstatSync(target);
    } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
    }

    // Reject symlinks/junctions and unexpected file types.
    if (
        stat.isSymbolicLink() ||
        (directory ? !stat.isDirectory() : !stat.isFile())
    ) {
        throw new Error(
            "Test history contains an unsafe path; no further files were cleared."
        );
    }

    return true;
}

function clearTestHistory({
    isTestMode,
    isPackaged,
    appDataPath,
    userDataPath,
    payslipHistoryFolder
}) {
    if (isTestMode !== true || isPackaged !== false) {
        throw new Error(
            "Test history reset is disabled outside development Test Mode."
        );
    }

    if (
        ![appDataPath, userDataPath, payslipHistoryFolder].every(
            value =>
                typeof value === "string" &&
                path.isAbsolute(value)
        )
    ) {
        throw new Error("Absolute test history paths are required.");
    }

    const testRoot = path.join(
        appDataPath,
        "Payslip Automation - Test"
    );

    const historyRoot = path.join(testRoot, "history");
    const payslipRoot = path.join(historyRoot, "payslips");

    if (
        path.resolve(userDataPath) !== path.resolve(testRoot) ||
        path.resolve(payslipHistoryFolder) !== path.resolve(payslipRoot)
    ) {
        throw new Error(
            "Test history paths do not match the isolated test profile."
        );
    }

    if (
        !inspectPath(testRoot, true) ||
        !inspectPath(historyRoot, true)
    ) {
        return 0;
    }

    const files = [];

    if (inspectPath(payslipRoot, true)) {
        for (const name of fs.readdirSync(payslipRoot)) {
            if (payslipHistoryName.test(name)) {
                files.push(path.join(payslipRoot, name));
            }
        }
    }

    files.push(
        path.join(historyRoot, "payroll-summary-deliveries.json"),
        path.join(historyRoot, "payroll-summary-deliveries.json.tmp")
    );

    // Validate every candidate before deleting anything.
    const existingFiles = files.filter(
        file => inspectPath(file, false)
    );

    // Delete individual files only. Never delete directories recursively.
    for (const file of existingFiles) {
        fs.unlinkSync(file);
    }

    return existingFiles.length;
}

module.exports = { clearTestHistory };