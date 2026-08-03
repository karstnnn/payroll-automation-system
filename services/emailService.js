async function send(employee) {

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

    employee.emailSent = true;

}

module.exports = {
  send
}


