// testDoctor.js

const { getContractInstance } = require("./src/config/web3");

async function test() {
    const userRegistry =
        getContractInstance("userRegistry");

    const result =
        await userRegistry.getUser(
            "0x4c7A1556964b48E1f589130cd64D46adc3f47Cd2"
        );

    console.log(result);
}

test();