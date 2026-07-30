const fs = require("fs");
const path = require("path");

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
    checkPDFs
};