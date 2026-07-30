const fs = require("fs");
const path = require("path");

function checkPDFs(employees, pdfFolder) {

    let found = 0;
    let missing = 0;

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

    }

    return {
        found,
        missing
    };

}

module.exports = {
    checkPDFs
};