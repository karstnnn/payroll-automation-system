const fs = require("fs");

const employeeService =
require("./services/employeeService");

const pdfService =
require("./services/pdfService");

const config = JSON.parse(
    fs.readFileSync("config.json", "utf8")
);

const employees =
employeeService.loadEmployees(
    config.employeeFile
);

const summary =
pdfService.checkPDFs(
    employees,
    config.pdfFolder
);

console.log(summary);