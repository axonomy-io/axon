//const { scripts, ConfigVariablesInitializer } = require('zos');
const { scripts, ConfigManager } = require('zos');
const { add, push, create } = scripts;

require('dotenv').config();

async function deploy(options) {
  let args = [
    process.env.OWNER,
  ];
  await add({ contractsData: [{ name: 'Airdrop', alias: 'Airdrop' }] });
  await push(options);
  //await create(Object.assign({ contractAlias: 'Airdrop', initMethod: 'initialize', initArgs: args }, options));
  await create(Object.assign({ contractAlias: 'Airdrop', methodName: 'initialize', methodArgs: args }, options));
}

module.exports = function(deployer, networkname, accounts) {
  deployer.then(async () => {
    const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: networkname, from: process.env.PROXY });
    await deploy({ network, txParams })
  })
}
