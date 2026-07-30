const fs = require("fs");

function loadEmployees(employeeFile) {
    return JSON.parse(
        fs.readFileSync(employeeFile, "utf8")
    );
}

module.exports = {
    loadEmployees
};
