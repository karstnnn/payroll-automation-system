const fs = require("fs");
const path = require("path");

async function waitForPDFs(employees, pdfFolder) {

    const timeout = 30000;
    const interval = 1000;

    const start = Date.now();

    while (Date.now() - start < timeout) {

        const allReady = employees.every(employee => {

            const pdfPath = path.join(pdfFolder, employee.pdf);

            return fs.existsSync(pdfPath);

        });

        if (allReady) {
            console.log("All PDFs are available.");
            return;
        }

        console.log("Waiting for Google Drive sync...");

        await new Promise(resolve =>
            setTimeout(resolve, interval)
        );
    }

    throw new Error("Timeout waiting for PDFs.");
}

function checkPDFs(employees, pdfFolder) {
    let emp = 0;
    let found = 0;
    let missing = 0;
    let summary = [];

    for (const employee of employees) {

        const pdfPath = path.join(
            pdfFolder,
            employee.pdf
        );
        console.log(`Checking PDF for ${employee.name} at ${pdfPath}`);
        employee.pdfPath = pdfPath;
        employee.pdfExists = fs.existsSync(pdfPath);

        if (employee.pdfExists) {
            found++;
        }
        else {
            missing++;
        }
        emp++;
    }
    summary = {
        found,
        missing,
        emp
    }
    return {
        employees,
        summary
    };

}

module.exports = {
    checkPDFs,
    waitForPDFs
};