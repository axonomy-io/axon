const { scripts, ConfigVariablesInitializer } = require('zos');
const { add, push, create } = scripts;

require('dotenv').config();

async function deploy(options) {
  let args = [
    process.env.NAME,
    process.env.SYMBOL,
    process.env.DECIMALS,
    process.env.TOTAL,
    process.env.OP_ADDRESS,
    process.env.FOUNDATION_ADDRESS,
    process.env.TEAM_ADDRESS,
    process.env.C_ADDRESS,
    process.env.POOL_ADDRESS,
    process.env.B_ADDRESS,
    process.env.OWNER
  ];

  await add({ contractsData: [{ name: 'AxonToken', alias: 'AxonToken' }] });
  await push(options);
  await create(Object.assign({ contractAlias: 'AxonToken', initMethod: 'initialize', initArgs: args }, options));
}

module.exports = function(deployer, networkname, accounts) {
  deployer.then(async () => {
    const { network, txParams } = await ConfigVariablesInitializer.initNetworkConfiguration({ network: networkname, from: process.env.PROXY });
    await deploy({ network, txParams })
  })
}
