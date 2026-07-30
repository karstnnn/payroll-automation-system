const fs = require("fs");

const employeeService =
require("./services/employeeService");

const pdfService =
require("./services/pdfService");

const logger = 
require("./utils/logger");

const config = JSON.parse(
    fs.readFileSync("config.json", "utf8")
);

const employees =
employeeService.loadEmployees(
    config.employeeFile
);

const result =
pdfService.checkPDFs(
    employees,
    config.pdfFolder
);

for (const employee of employees) {
    logger.logEmployee(employee);
}

logger.logSummary(result.summary);