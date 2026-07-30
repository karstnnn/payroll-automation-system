const fs = require("fs");

function logEmployee(employee){

    console.log(employee.name);
    console.log(employee.email);

    if(employee.pdfExists){
        console.log("✓ PDF Found");
    }
    else{
        console.log("✗ PDF Missing");
    }
    console.log("------------------------");
}

function logSummary(summary){
  console.log("========================");
  console.log("Summary");
  console.log("========================");

  console.log(`Employees: ${summary.emp}`);
  console.log(`PDF Found: ${summary.found}`);
  console.log(`Missing: ${summary.missing}`);
}

module.exports = {
    logEmployee,
    logSummary
};