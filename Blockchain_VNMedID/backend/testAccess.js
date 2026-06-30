// testAccess.js

const { getContractInstance } = require("./src/config/web3");

async function main() {
  const access = getContractInstance("accessControl");

  const result = await access.checkAccess(
    "6a3412faf834a1fefd1862ff",
    "0x4c7A1556964b48E1f589130cd64D46adc3f47Cd2"
  );

  console.log("Has Access:", result);
}

main();