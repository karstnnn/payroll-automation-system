const fs = require("fs");

const employeeService =
require("./services/employeeService");

const pdfService =
require("./services/pdfService");

const emailService =
require("./services/emailService")

const logger = 
require("./utils/logger");

async function main() {
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

       if(!employee.pdfExists){
            logger.logEmployee(employee);
            continue;
        }
        await emailService.send(employee);
        logger.logEmployee(employee);
    }
    
    logger.logSummary(result.summary);
    await emailService.verifyConnection(config);
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});