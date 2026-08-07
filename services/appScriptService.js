const fetch = global.fetch;

async function generatePayslips(){

    console.log(
        "Generating payslips..."
    );

    const response =
        await fetch(
            process.env.APPS_SCRIPT_URL +
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

module.exports = {

    generatePayslips

}