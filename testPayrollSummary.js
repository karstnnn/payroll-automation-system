
const fs = require("fs");
const path = require("path");

const {
    preparePayrollSummary
} = require("./services/payrollSummaryService");


async function main() {

    const settingsPath = process.argv[2] ||
        path.join(
            process.env.APPDATA,
            "pay-slip",
            "settings.json"
        );

    const settings = JSON.parse(
        fs.readFileSync(settingsPath, "utf8")
    );

    const result = await preparePayrollSummary(
        {
            appsScriptUrl: settings.appsScriptUrl,
            pdfRootFolder: settings.pdfRootFolder
        },
        (progress) => {
            console.log(progress.message);
        }
    );

    console.log("\nPayroll Summary Test Result:");
    console.log("Success:", result.success);
    console.log("Month:", result.month);
    console.log("Filename:", result.fileName);
    console.log("PDF Path:", result.pdfPath);

}


main().catch(error => {
    console.error("Test failed:", error.message);
    process.exitCode = 1;
});
