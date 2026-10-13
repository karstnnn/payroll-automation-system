const fetch = global.fetch;

async function generatePayslips(appsScriptUrl){

    console.log(
        "Generating payslips..."
    );

    const response =
        await fetch(
            appsScriptUrl +
            "?action=generate"
        );

    console.log("Execution completed.");

    if(!response.ok){

        throw new Error(
            "Failed to execute Apps Script."
        );

    }
    console.log("before result");
    const result =
        await response.json();

    console.log("after result");
    if (!result.success) {
        throw new Error(result.error);
    }

    console.log(`Generated: ${result.generated}`);
    console.log(`Failed: ${result.failed}`);

}

async function generatePayrollSummary(appsScriptUrl) {

    console.log("Generating payroll summary...");

    const response = await fetch(
        appsScriptUrl + "?action=generate-payroll"
    );

    if (!response.ok) {
        throw new Error(
            "Failed to execute Payroll Summary Apps Script."
        );
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(
            result.error || "Payroll summary generation failed."
        );
    }

    console.log(
        `Payroll summary generated: ${result.fileName}`
    );

    return result;
}

module.exports = {

    generatePayslips,
    generatePayrollSummary
}
